/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import type { RuleDoctorInsightDoc } from '../../../../server/resources/indices/rule_doctor_insights';
import { RULE_DOCTOR_INSIGHTS_INDEX } from '../constants';

export type InsightSeed = Pick<RuleDoctorInsightDoc, 'insight_id'> &
  Partial<Omit<RuleDoctorInsightDoc, 'insight_id' | '@timestamp'>>;

const INSIGHT_DEFAULTS: Omit<RuleDoctorInsightDoc, 'insight_id' | '@timestamp'> = {
  execution_id: 'exec-1',
  status: 'open',
  type: 'coverage_gap',
  action: 'create_rule',
  impact: 'medium',
  confidence: 'high',
  title: 'Test insight',
  summary: 'A test insight for Scout API tests',
  justification: 'Generated for Scout API tests',
  rule_ids: [],
  data: {},
  current: null,
  proposed: null,
  space_id: 'default',
};

export interface InsightsApiService {
  seed: (insights: InsightSeed[]) => Promise<void>;
  cleanUp: () => Promise<void>;
}

export const getInsightsApiService = ({
  log,
  esClient,
}: {
  log: ScoutLogger;
  esClient: EsClient;
}): InsightsApiService => ({
  seed: (insights) =>
    measurePerformanceAsync(log, 'insights.seed', async () => {
      const operations = insights.flatMap((insight) => {
        const document = {
          '@timestamp': new Date().toISOString(),
          ...INSIGHT_DEFAULTS,
          ...insight,
        };
        return [
          { index: { _index: RULE_DOCTOR_INSIGHTS_INDEX, _id: document.insight_id } },
          document,
        ];
      });
      await esClient.bulk({ operations, refresh: 'wait_for' });
    }),

  cleanUp: () =>
    measurePerformanceAsync(log, 'insights.cleanUp', async () => {
      await esClient.deleteByQuery(
        {
          index: RULE_DOCTOR_INSIGHTS_INDEX,
          query: { match_all: {} },
          refresh: true,
          wait_for_completion: true,
          conflicts: 'proceed',
        },
        { ignore: [404] }
      );
    }),
});
