/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../knowledge_indicators';
import { DETECTIONS_DATA_STREAM } from '../significant_events/detections';
import { EVENTS_DATA_STREAM } from '../significant_events/events';
import { getSignificantEventsUserPrivileges } from './get_user_privileges';

type Grant = Record<string, boolean>;

const buildEsClient = (index: Record<string, Grant>) => {
  const hasPrivileges = jest.fn(async () => ({ index }));
  return {
    client: { security: { hasPrivileges } } as unknown as ElasticsearchClient,
    hasPrivileges,
  };
};

describe('getSignificantEventsUserPrivileges', () => {
  it('returns full access without querying Elasticsearch when security is disabled', async () => {
    const { client, hasPrivileges } = buildEsClient({});

    await expect(
      getSignificantEventsUserPrivileges({ esClient: client, isSecurityEnabled: false })
    ).resolves.toEqual({
      knowledgeIndicators: { read: true, write: true },
      significantEvents: { read: true, write: true },
    });
    expect(hasPrivileges).not.toHaveBeenCalled();
  });

  it('maps read-only grants to read-only privileges', async () => {
    const { client } = buildEsClient({
      [KNOWLEDGE_INDICATORS_DATA_STREAM]: { read: true, write: false },
      [DETECTIONS_DATA_STREAM]: { read: true, write: false },
      [EVENTS_DATA_STREAM]: { read: true },
    });

    await expect(
      getSignificantEventsUserPrivileges({ esClient: client, isSecurityEnabled: true })
    ).resolves.toEqual({
      knowledgeIndicators: { read: true, write: false },
      significantEvents: { read: true, write: false },
    });
  });

  it('collapses significant events read to false when only events read is missing', async () => {
    const { client } = buildEsClient({
      [KNOWLEDGE_INDICATORS_DATA_STREAM]: { read: true, write: true },
      [DETECTIONS_DATA_STREAM]: { read: true, write: true },
      [EVENTS_DATA_STREAM]: { read: false },
    });

    await expect(
      getSignificantEventsUserPrivileges({ esClient: client, isSecurityEnabled: true })
    ).resolves.toEqual({
      knowledgeIndicators: { read: true, write: true },
      significantEvents: { read: false, write: true },
    });
  });

  it('treats missing entries as not granted', async () => {
    const { client } = buildEsClient({});

    await expect(
      getSignificantEventsUserPrivileges({ esClient: client, isSecurityEnabled: true })
    ).resolves.toEqual({
      knowledgeIndicators: { read: false, write: false },
      significantEvents: { read: false, write: false },
    });
  });
});
