/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { UiamApiKeyProvisioningEntityType } from '../../saved_objects/schemas/raw_uiam_api_keys_provisioning_status';
import { getUiamApiKeyProvisioningStatusTelemetry } from './get_uiam_api_key_provisioning_status_telemetry';

describe('getUiamApiKeyProvisioningStatusTelemetry', () => {
  const logger = {
    warn: jest.fn(),
    debug: jest.fn(),
    isLevelEnabled: jest.fn().mockReturnValue(false),
  } as unknown as Logger;

  const soType = UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE;

  it('aggregates counts by status from Elasticsearch terms aggregation', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: { total: { value: 4 } },
        aggregations: {
          by_status: {
            buckets: [
              { key: 'completed', doc_count: 2 },
              { key: 'failed', doc_count: 1 },
              { key: 'skipped', doc_count: 1 },
            ],
          },
        },
      }),
    };

    const result = await getUiamApiKeyProvisioningStatusTelemetry({
      esClient: esClient as never,
      savedObjectsIndex: '.kibana_alerting_cases_8',
      logger,
    });

    expect(result.hasErrors).toBe(false);
    expect(result.count_uiam_api_key_provisioning_status_total).toBe(4);
    expect(result.count_uiam_api_key_provisioning_status_completed).toBe(2);
    expect(result.count_uiam_api_key_provisioning_status_failed).toBe(1);
    expect(result.count_uiam_api_key_provisioning_status_skipped).toBe(1);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.kibana_alerting_cases_8',
        size: 0,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              { term: { type: soType } },
              { term: { [`${soType}.entityType`]: UiamApiKeyProvisioningEntityType.RULE } },
            ],
          },
        },
        aggs: {
          by_status: {
            terms: {
              field: `${soType}.status`,
              size: 16,
            },
          },
        },
      })
    );
  });

  it('returns zeros and hasErrors on search failure', async () => {
    const esClient = {
      search: jest.fn().mockRejectedValue(new Error('ES failure')),
    };

    const result = await getUiamApiKeyProvisioningStatusTelemetry({
      esClient: esClient as never,
      savedObjectsIndex: '.kibana_alerting_cases_8',
      logger,
    });

    expect(result.hasErrors).toBe(true);
    expect(result.errorMessage).toContain('ES failure');
    expect(result.count_uiam_api_key_provisioning_status_total).toBe(0);
    expect(result.count_uiam_api_key_provisioning_status_completed).toBe(0);
    expect(result.count_uiam_api_key_provisioning_status_failed).toBe(0);
    expect(result.count_uiam_api_key_provisioning_status_skipped).toBe(0);
  });
});
