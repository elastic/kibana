/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createCollectorFetchContextMock,
  createUsageCollectionSetupMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import { ML_ALERT_TYPES } from '@kbn/ml-common-constants/alerts';
import { registerCollector } from './collector';
import { ML_DETECTOR_RULE_ACTION } from '@kbn/ml-anomaly-utils';
import { emptyCustomRulesUsage } from './custom_rules_usage_aggregation';

describe('ML usage collector', () => {
  const alertIndex = '.internal.alerts-default-000001';

  const emptyAggResponse = {
    aggregations: {
      count_by_result_type: {
        buckets: [] as Array<{
          key: string;
          doc_count: number;
          with_kql_filter: { doc_count: number };
        }>,
      },
    },
  };

  const emptyHitsResponse = {
    hits: { hits: [] as unknown[] },
  };

  let usageCollectionMock: ReturnType<typeof createUsageCollectionSetupMock>;
  let getIndexForType: jest.MockedFunction<(type: string) => Promise<string>>;
  let fetchContextMock: ReturnType<typeof createCollectorFetchContextMock>;
  let getJobsMock: jest.Mock;

  beforeEach(() => {
    usageCollectionMock = createUsageCollectionSetupMock();
    getIndexForType = jest.fn().mockResolvedValue(alertIndex);
    fetchContextMock = createCollectorFetchContextMock();
    getJobsMock = jest.fn().mockResolvedValue({ jobs: [] });

    fetchContextMock.esClient.search = jest
      .fn()
      .mockResolvedValueOnce(emptyAggResponse)
      .mockResolvedValueOnce(emptyHitsResponse);

    Object.defineProperty(fetchContextMock.esClient, 'ml', {
      value: {
        getJobs: getJobsMock,
        getCalendars: jest.fn().mockResolvedValue({ calendars: [] }),
        getCalendarEvents: jest.fn().mockResolvedValue({ events: [] }),
        getFilters: jest.fn().mockResolvedValue({ filters: [] }),
      },
      writable: true,
      configurable: true,
    });
  });

  it('calls makeUsageCollector and registerCollector', () => {
    registerCollector(usageCollectionMock, getIndexForType);
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalledTimes(1);
    expect(usageCollectionMock.registerCollector).toHaveBeenCalledTimes(1);
    expect(usageCollectionMock.makeUsageCollector.mock.calls[0][0].type).toBe('ml');
  });

  it('returns empty custom_rules when getJobs returns no jobs', async () => {
    registerCollector(usageCollectionMock, getIndexForType);
    const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;
    const data = await collector.fetch(fetchContextMock);

    expect(data.custom_rules).toEqual(emptyCustomRulesUsage());
    expect(data.alertRules[ML_ALERT_TYPES.AD_JOBS_HEALTH].count_by_check_type).toEqual({
      datafeed: 0,
      mml: 0,
      delayedData: 0,
      errorMessages: 0,
    });
  });

  it('aggregates custom_rules from getJobs response', async () => {
    getJobsMock.mockResolvedValue({
      jobs: [
        {
          analysis_config: {
            detectors: [
              {
                custom_rules: [
                  {
                    actions: [ML_DETECTOR_RULE_ACTION.SKIP_RESULT],
                    conditions: [{ x: 1 }],
                  },
                ],
              },
            ],
          },
        },
      ],
    });

    registerCollector(usageCollectionMock, getIndexForType);
    const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;
    const data = await collector.fetch(fetchContextMock);

    expect(data.custom_rules).toEqual({
      total_count: 1,
      jobs_with_rules_count: 1,
      detectors_with_rules_count: 1,
      count_by_action: { skip_result: 1, skip_model_update: 0 },
      count_with_conditions: 1,
      count_with_scope: 0,
    });
  });

  it('returns zero custom_rules when getJobs throws but still returns alertRules', async () => {
    getJobsMock.mockRejectedValue(new Error('ML unavailable'));

    registerCollector(usageCollectionMock, getIndexForType);
    const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;
    const data = await collector.fetch(fetchContextMock);

    expect(data.custom_rules.total_count).toBe(0);
    expect(data.custom_rules.jobs_with_rules_count).toBe(0);
    expect(data.alertRules).toBeDefined();
    expect(data.alertRules[ML_ALERT_TYPES.AD_JOBS_HEALTH]).toBeDefined();
  });
});
