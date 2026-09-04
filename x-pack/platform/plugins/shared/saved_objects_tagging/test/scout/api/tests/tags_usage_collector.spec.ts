/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, TELEMETRY_HEADERS, KBN_ARCHIVES } from '../fixtures';

interface TaggingStatsForType {
  taggedObjects: number;
  usedTags: number;
}

interface TaggingStats {
  types: Record<string, TaggingStatsForType | undefined>;
}

interface TelemetryStatsResponse {
  stats: {
    stack_stats: {
      kibana: {
        plugins: {
          saved_objects_tagging: TaggingStats;
        };
      };
    };
  };
}

const getStatsForType = (taggingStats: TaggingStats, type: string): TaggingStatsForType =>
  taggingStats.types[type] ?? { taggedObjects: 0, usedTags: 0 };

/*
 * Dataset: 5 tags (tag-1..4 + unused-tag), 2 tagged dashboards, 3 tagged visualizations.
 * - dashboard refs: tag-1+tag-2, tag-2+tag-4 → 2 tagged objects, 3 distinct tags
 * - visualization refs: tag-1, tag-1+tag-3, tag-3 → 3 tagged objects, 2 distinct tags
 */
apiTest.describe(
  'Saved Objects Tagging - usage collector',
  { tag: tags.deploymentAgnostic },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVES.USAGE_COLLECTION);
    });

    apiTest(
      'reports correct tag usage counts via the telemetry endpoint',
      async ({ apiClient, kbnClient }) => {
        const fetchTaggingStats = async (): Promise<TaggingStats> => {
          const response = await apiClient.post('internal/telemetry/clusters/_stats', {
            headers: { ...TELEMETRY_HEADERS, ...cookieHeader },
            body: { unencrypted: true, refreshCache: true },
          });

          expect(response).toHaveStatusCode(200);

          const [telemetryStats] = response.body as TelemetryStatsResponse[];
          return telemetryStats.stats.stack_stats.kibana.plugins.saved_objects_tagging;
        };

        await kbnClient.importExport.unload(KBN_ARCHIVES.USAGE_COLLECTION);
        const baseline = await fetchTaggingStats();
        await kbnClient.importExport.load(KBN_ARCHIVES.USAGE_COLLECTION);
        const taggingStats = await fetchTaggingStats();

        const baselineDashboardStats = getStatsForType(baseline, 'dashboard');
        const dashboardStats = getStatsForType(taggingStats, 'dashboard');
        expect(dashboardStats.taggedObjects).toBeGreaterThanOrEqual(
          baselineDashboardStats.taggedObjects + 2
        );
        expect(dashboardStats.usedTags).toBeGreaterThanOrEqual(baselineDashboardStats.usedTags);

        const baselineVisualizationStats = getStatsForType(baseline, 'visualization');
        const visualizationStats = getStatsForType(taggingStats, 'visualization');
        expect(visualizationStats.taggedObjects).toBeGreaterThanOrEqual(
          baselineVisualizationStats.taggedObjects + 3
        );
        expect(visualizationStats.usedTags).toBeGreaterThanOrEqual(
          baselineVisualizationStats.usedTags
        );
      }
    );
  }
);
