/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { FilterStats } from '@kbn/ml-common-types/filters';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import {
  getADFqFilterStatsJobConfig1,
  getADFqFilterStatsJobConfig2,
} from '../../services/ml_common_configs';

const jobConfig1 = getADFqFilterStatsJobConfig1('fq_filter_stats_1');
const jobConfig2 = getADFqFilterStatsJobConfig2('fq_filter_stats_2');
const testJobConfigs = [jobConfig1, jobConfig2];

const testFilters: estypes.MlFilter[] = [
  { filter_id: 'ignore_a_airlines', description: 'Airlines starting with A', items: ['AAL'] },
  {
    filter_id: 'ignore_b_airlines',
    description: 'Airlines starting with B',
    items: ['BAA', 'BAB'],
  },
  {
    filter_id: 'ignore_c_airlines',
    description: 'Airlines starting with C',
    items: ['CAA', 'CAB', 'CCC'],
  },
];

// TODO: Add the ECH cloud tag once support for custom roles is implemented.
// See related issue: https://github.com/elastic/kibana/issues/259284
apiTest.describe(
  'get_filters_stats',
  {
    tag: [
      '@local-stateful-classic',
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      for (const filter of testFilters) {
        await apiServices.ml.anomalyDetection.filters.delete(filter.filter_id);
        await apiServices.ml.anomalyDetection.filters.create(filter);
      }
      for (const jobConfig of testJobConfigs) {
        await apiServices.ml.anomalyDetection.delete({ jobIds: [jobConfig.job_id] }).catch(() => {
          /* no-op if job doesn't exist */
        });
        await apiServices.ml.anomalyDetection.createViaKibana(jobConfig);
      }
    });

    apiTest.afterAll(async ({ apiServices, esClient, log }) => {
      // Scoped cleanup: only delete resources created by this test
      for (const jobConfig of testJobConfigs) {
        await esClient.ml
          .deleteJob({ job_id: jobConfig.job_id, force: true, wait_for_completion: true })
          .catch((e: Error) =>
            log.debug(
              `[get_filters_stats] Failed to delete AD job ${jobConfig.job_id}: ${e.message}`
            )
          );
      }
      for (const { filter_id } of testFilters) {
        await apiServices.ml.anomalyDetection.filters.delete(filter_id);
      }
    });

    apiTest('should fetch all filters stats', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.get('internal/ml/filters/_stats', {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      expect((res.body as FilterStats[]).length).toBeGreaterThanOrEqual(testFilters.length);

      const statsMap = new Map((res.body as FilterStats[]).map((s) => [s.filter_id, s]));

      // Filter used by both jobs
      const filterAStats = statsMap.get('ignore_a_airlines');
      expect(filterAStats?.item_count).toBe(1);
      expect(filterAStats?.used_by?.jobs.sort()).toStrictEqual(
        [jobConfig1.job_id, jobConfig2.job_id].sort()
      );
      expect(filterAStats?.used_by?.detectors.sort()).toStrictEqual(
        [
          `${jobConfig1.analysis_config.detectors[0].detector_description} (${jobConfig1.job_id})`,
          `${jobConfig2.analysis_config.detectors[1].detector_description} (${jobConfig2.job_id})`,
        ].sort()
      );

      // Filter used by one job
      const filterBStats = statsMap.get('ignore_b_airlines');
      expect(filterBStats?.item_count).toBe(2);
      expect(filterBStats?.used_by?.jobs).toStrictEqual([jobConfig1.job_id]);
      expect(filterBStats?.used_by?.detectors).toStrictEqual([
        `${jobConfig1.analysis_config.detectors[0].detector_description} (${jobConfig1.job_id})`,
      ]);

      // Filter not used by any job
      const filterCStats = statsMap.get('ignore_c_airlines');
      expect(filterCStats?.item_count).toBe(3);
      expect(filterCStats?.used_by).toBeUndefined();
    });

    apiTest(
      'should not allow retrieving filters stats for user without required permission',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlViewer();

        const res = await apiClient.get('internal/ml/filters/_stats', {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(403);
        expect(res.body.error).toBe('Forbidden');
      }
    );

    apiTest(
      'should not allow retrieving filters stats for unauthorized user',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlUnauthorized();

        const res = await apiClient.get('internal/ml/filters/_stats', {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(403);
        expect(res.body.error).toBe('Forbidden');
      }
    );
  }
);
