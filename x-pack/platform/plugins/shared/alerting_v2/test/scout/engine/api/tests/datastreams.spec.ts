/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * These specs talk to Elasticsearch directly to check the data streams Kibana installed at startup.
 *
 * Producers no longer set `@timestamp`; each data stream's `index.final_pipeline` assigns it at
 * ingest. Patching backing indices created before the template had the setting is covered by
 * the `DatastreamInitializer` unit tests.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { expect } from '@kbn/scout/api';
import { getAlertActionsResourceDefinition } from '../../../../../server/resources/datastreams/alert_actions';
import {
  ALERT_EVENTS_DATA_IGNORE_ABOVE,
  getAlertEventsResourceDefinition,
} from '../../../../../server/resources/datastreams/alert_events';
import { apiTest, testData } from '../fixtures';

const MARKER = 'scout-final-pipeline';
const DATA_IGNORE_ABOVE_RULE_ID = 'scout-data-ignore-above';

const RESOURCES = [
  {
    definition: getAlertEventsResourceDefinition(),
    markerField: 'rule.id',
    markers: [MARKER, DATA_IGNORE_ABOVE_RULE_ID],
    document: { rule: { id: MARKER } },
  },
  {
    definition: getAlertActionsResourceDefinition(),
    markerField: 'rule_id',
    markers: [MARKER],
    document: { rule_id: MARKER },
  },
];

const { dataStreamName: ALERT_EVENTS_DATA_STREAM } = getAlertEventsResourceDefinition();

// Both values are over the Lucene max term size (32766 bytes), which used to reject the document.
const LONG_ASCII_VALUE = 'a'.repeat(40_000);
const LONG_MULTI_BYTE_VALUE = '😀'.repeat(9_000);

const searchIgnoreAboveEvents = async (esClient: EsClient, query: Record<string, unknown>) => {
  const { hits } = await esClient.search<{ data: Record<string, string> }>({
    index: ALERT_EVENTS_DATA_STREAM,
    query: { bool: { filter: [{ term: { 'rule.id': DATA_IGNORE_ABOVE_RULE_ID } }, query] } },
  });
  return hits.hits;
};

apiTest.describe('Alerting v2 data streams', { tag: testData.API_ENGINE_TAG }, () => {
  apiTest.afterAll(async ({ esClient }) => {
    for (const { definition, markerField, markers } of RESOURCES) {
      await esClient.deleteByQuery(
        {
          index: definition.dataStreamName,
          query: { terms: { [markerField]: markers } },
          refresh: true,
          conflicts: 'proceed',
        },
        { ignore: [404] }
      );
    }
  });

  for (const { definition, markerField, document } of RESOURCES) {
    const { dataStreamName, version, finalPipeline } = definition;

    apiTest(`${dataStreamName}: installs the managed ingest pipeline`, async ({ esClient }) => {
      const pipelines = await esClient.ingest.getPipeline({ id: finalPipeline.id });

      expect(pipelines[finalPipeline.id]).toMatchObject({
        version: finalPipeline.version,
        _meta: { managed: true },
      });
    });

    apiTest(
      `${dataStreamName}: index template sets index.final_pipeline at the current version`,
      async ({ esClient }) => {
        const { index_templates: templates } = await esClient.indices.getIndexTemplate({
          name: dataStreamName,
        });
        const [{ index_template: template }] = templates;

        expect(template._meta?.version).toBe(version);
        expect(template.template?.settings?.index?.final_pipeline).toBe(finalPipeline.id);
      }
    );

    apiTest(`${dataStreamName}: stamps timestamp on writes that omit it`, async ({ esClient }) => {
      await esClient.index({ index: dataStreamName, document, refresh: 'wait_for' });

      const { hits } = await esClient.search<{ '@timestamp'?: string }>({
        index: dataStreamName,
        query: { term: { [markerField]: MARKER } },
      });

      expect(hits.hits).toHaveLength(1);
      expect(Number.isNaN(Date.parse(hits.hits[0]._source?.['@timestamp'] ?? ''))).toBe(false);
    });

    apiTest(
      `${dataStreamName}: every backing index has index.final_pipeline`,
      async ({ esClient }) => {
        const { data_streams: dataStreams } = await esClient.indices.getDataStream({
          name: dataStreamName,
        });
        const backingIndices = dataStreams[0].indices.map(({ index_name: name }) => name);
        const settings = await esClient.indices.getSettings({ index: backingIndices });

        expect(backingIndices.length).toBeGreaterThan(0);
        for (const index of backingIndices) {
          expect(settings[index].settings?.index?.final_pipeline).toBe(finalPipeline.id);
        }
      }
    );
  }

  apiTest(
    `${ALERT_EVENTS_DATA_STREAM}: maps data with ignore_above on the write index`,
    async ({ esClient }) => {
      const { data_streams: dataStreams } = await esClient.indices.getDataStream({
        name: ALERT_EVENTS_DATA_STREAM,
      });
      const { indices } = dataStreams[0];
      const writeIndex = indices[indices.length - 1].index_name;
      const mapping = await esClient.indices.getFieldMapping({ index: writeIndex, fields: 'data' });

      expect(mapping[writeIndex].mappings.data?.mapping.data).toStrictEqual({
        type: 'flattened',
        ignore_above: ALERT_EVENTS_DATA_IGNORE_ABOVE,
      });
    }
  );

  apiTest(
    `${ALERT_EVENTS_DATA_STREAM}: stores data values over the Lucene term limit without indexing them`,
    async ({ esClient }) => {
      await esClient.index({
        index: ALERT_EVENTS_DATA_STREAM,
        document: {
          rule: { id: DATA_IGNORE_ABOVE_RULE_ID },
          data: {
            long_ascii: LONG_ASCII_VALUE,
            long_multi_byte: LONG_MULTI_BYTE_VALUE,
            short: 'short-value',
          },
        },
        refresh: 'wait_for',
      });

      const [event] = await searchIgnoreAboveEvents(esClient, { match_all: {} });
      expect(event._source?.data).toStrictEqual({
        long_ascii: LONG_ASCII_VALUE,
        long_multi_byte: LONG_MULTI_BYTE_VALUE,
        short: 'short-value',
      });

      expect(
        await searchIgnoreAboveEvents(esClient, { term: { 'data.short': 'short-value' } })
      ).toHaveLength(1);
      expect(
        await searchIgnoreAboveEvents(esClient, { exists: { field: 'data.long_ascii' } })
      ).toHaveLength(0);
      expect(
        await searchIgnoreAboveEvents(esClient, { exists: { field: 'data.long_multi_byte' } })
      ).toHaveLength(0);
    }
  );
});
