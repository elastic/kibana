/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { v4 as uuidv4 } from 'uuid';
import { streamsApiTest as apiTest } from '../fixtures';
import { PUBLIC_API_HEADERS } from '../fixtures/constants';
import { featureStorageSettings } from '../../../../server/lib/streams/feature/storage_settings';
import { queryStorageSettings } from '../../../../server/lib/streams/assets/storage_settings';
import {
  FEATURE_CONFIDENCE,
  FEATURE_DESCRIPTION,
  FEATURE_ID,
  FEATURE_LAST_SEEN,
  FEATURE_PROPERTIES,
  FEATURE_STATUS,
  FEATURE_TYPE,
  FEATURE_UUID,
  STREAM_NAME as FEATURE_STREAM_NAME,
} from '../../../../server/lib/streams/feature/fields';
import {
  ASSET_ID,
  ASSET_TYPE,
  ASSET_UUID,
  QUERY_DESCRIPTION,
  QUERY_ESQL_QUERY,
  QUERY_EVIDENCE,
  QUERY_SEVERITY_SCORE,
  QUERY_TITLE,
  RULE_BACKED,
  RULE_ID,
  STREAM_NAME as QUERY_STREAM_NAME,
} from '../../../../server/lib/streams/assets/fields';
import { getQueryLinkUuid } from '../../../../server/lib/streams/assets/query/query_client';

const TOOL_ID = 'platform.streams.sig_events.search_knowledge_indicators';

apiTest.describe('search_knowledge_indicators tool', { tag: ['@ess', '@svlOblt'] }, () => {
  const rootStream = 'logs.otel';
  const streamName = `${rootStream}.kis_${uuidv4().slice(0, 8)}`;

  const featureUuidLow = `feature-${uuidv4()}`;
  const featureUuidHigh = `feature-${uuidv4()}`;

  const queryIdPayment = `q-${uuidv4()}`;
  const queryIdOther = `q-${uuidv4()}`;

  const paymentAssetUuid = getQueryLinkUuid(streamName, {
    'asset.type': 'query',
    'asset.id': queryIdPayment,
  });
  const otherAssetUuid = getQueryLinkUuid(streamName, {
    'asset.type': 'query',
    'asset.id': queryIdOther,
  });

  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.streamsTest.enable();
    await apiServices.streamsTest.enableSignificantEvents();

    await apiServices.streamsTest.forkStream(rootStream, streamName, {
      field: 'service.name',
      eq: `kis-tool-${streamName}`,
    });
  });

  apiTest.afterAll(async ({ apiServices, esClient }) => {
    await apiServices.streamsTest.cleanupTestStreams(streamName);
    await apiServices.streamsTest.disableSignificantEvents();

    await Promise.allSettled([
      esClient.delete({ index: featureStorageSettings.name, id: featureUuidLow }),
      esClient.delete({ index: featureStorageSettings.name, id: featureUuidHigh }),
      esClient.delete({ index: queryStorageSettings.name, id: paymentAssetUuid }),
      esClient.delete({ index: queryStorageSettings.name, id: otherAssetUuid }),
    ]);

    await Promise.allSettled([
      esClient.indices.refresh({ index: featureStorageSettings.name }),
      esClient.indices.refresh({ index: queryStorageSettings.name }),
    ]);
  });

  apiTest(
    'returns knowledge indicators (features + queries) by default',
    async ({ apiClient, samlAuth, esClient }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const now = new Date().toISOString();
      await esClient.index({
        index: featureStorageSettings.name,
        id: featureUuidLow,
        refresh: 'wait_for',
        document: {
          [FEATURE_UUID]: featureUuidLow,
          [FEATURE_ID]: 'feature-low',
          [FEATURE_TYPE]: 'log_patterns',
          [FEATURE_DESCRIPTION]: 'low confidence feature',
          [FEATURE_PROPERTIES]: {},
          [FEATURE_CONFIDENCE]: 30,
          [FEATURE_STATUS]: 'active',
          [FEATURE_LAST_SEEN]: now,
          [FEATURE_STREAM_NAME]: streamName,
        },
      });

      await esClient.index({
        index: featureStorageSettings.name,
        id: featureUuidHigh,
        refresh: 'wait_for',
        document: {
          [FEATURE_UUID]: featureUuidHigh,
          [FEATURE_ID]: 'feature-high',
          [FEATURE_TYPE]: 'error_logs',
          [FEATURE_DESCRIPTION]: 'high confidence feature',
          [FEATURE_PROPERTIES]: {},
          [FEATURE_CONFIDENCE]: 90,
          [FEATURE_STATUS]: 'active',
          [FEATURE_LAST_SEEN]: now,
          [FEATURE_STREAM_NAME]: streamName,
        },
      });

      await esClient.index({
        index: queryStorageSettings.name,
        id: paymentAssetUuid,
        refresh: 'wait_for',
        document: {
          [ASSET_UUID]: paymentAssetUuid,
          [ASSET_TYPE]: 'query',
          [ASSET_ID]: queryIdPayment,
          [QUERY_STREAM_NAME]: streamName,
          [QUERY_TITLE]: 'Payment errors',
          [QUERY_DESCRIPTION]: 'Find payment-related errors',
          [QUERY_ESQL_QUERY]: 'FROM logs-* | WHERE service.name == "payment"',
          [QUERY_SEVERITY_SCORE]: 88,
          [QUERY_EVIDENCE]: ['e1'],
          [RULE_BACKED]: true,
          [RULE_ID]: 'rule-payment',
        },
      });

      await esClient.index({
        index: queryStorageSettings.name,
        id: otherAssetUuid,
        refresh: 'wait_for',
        document: {
          [ASSET_UUID]: otherAssetUuid,
          [ASSET_TYPE]: 'query',
          [ASSET_ID]: queryIdOther,
          [QUERY_STREAM_NAME]: streamName,
          [QUERY_TITLE]: 'Other query',
          [QUERY_DESCRIPTION]: 'Not payment related',
          [QUERY_ESQL_QUERY]: 'FROM logs-* | LIMIT 10',
          [RULE_BACKED]: false,
          [RULE_ID]: 'rule-other',
        },
      });

      const res = await apiClient.post('api/agent_builder/tools/_execute', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          tool_id: TOOL_ID,
          tool_params: {
            streamNames: [streamName],
          },
        },
        responseType: 'json',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].type).toBe('other');

      const output = res.body.results[0].data as { knowledge_indicators: Array<{ kind: string }> };
      const kinds = output.knowledge_indicators.map((ki) => ki.kind);
      expect(kinds).toContain('feature');
      expect(kinds).toContain('query');
    }
  );

  apiTest('supports kind=[query] (queries-only KIs)', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const res = await apiClient.post('api/agent_builder/tools/_execute', {
      headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
      body: {
        tool_id: TOOL_ID,
        tool_params: {
          streamNames: [streamName],
          kind: ['query'],
        },
      },
      responseType: 'json',
    });

    expect(res.statusCode).toBe(200);
    const output = res.body.results[0].data as {
      knowledge_indicators: Array<{ kind: string; query?: { id: string } }>;
    };
    expect(output.knowledge_indicators.length).toBeGreaterThan(0);
    expect(output.knowledge_indicators.every((ki) => ki.kind === 'query')).toBe(true);
    expect(output.knowledge_indicators.map((ki) => ki.query?.id)).toContain(queryIdPayment);
  });

  apiTest(
    'returns an error result when Significant Events is disabled',
    async ({ apiClient, samlAuth, apiServices }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      await apiServices.streamsTest.disableSignificantEvents();

      try {
        const res = await apiClient.post('api/agent_builder/tools/_execute', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            tool_id: TOOL_ID,
            tool_params: {
              streamNames: [streamName],
            },
          },
          responseType: 'json',
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.results).toHaveLength(1);
        expect(res.body.results[0].type).toBe('error');
        expect((res.body.results[0].data as { message: string }).message).toContain(
          'Significant events is disabled'
        );
      } finally {
        await apiServices.streamsTest.enableSignificantEvents();
      }
    }
  );
});
