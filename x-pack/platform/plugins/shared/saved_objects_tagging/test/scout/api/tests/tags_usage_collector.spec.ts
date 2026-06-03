/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, TELEMETRY_HEADERS, KBN_ARCHIVES } from '../fixtures';

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

    apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      await kbnClient.savedObjects.clean({ types: ['tag', 'dashboard', 'visualization'] });
      await kbnClient.importExport.load(KBN_ARCHIVES.USAGE_COLLECTION);
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVES.USAGE_COLLECTION);
    });

    apiTest(
      'reports correct tag usage counts via the telemetry endpoint',
      async ({ apiClient }) => {
        const response = await apiClient.post('internal/telemetry/clusters/_stats', {
          headers: { ...TELEMETRY_HEADERS, ...cookieHeader },
          body: { unencrypted: true, refreshCache: true },
        });

        expect(response).toHaveStatusCode(200);

        const taggingStats =
          response.body[0].stats.stack_stats.kibana.plugins.saved_objects_tagging;

        expect(taggingStats.types.dashboard).toStrictEqual({ taggedObjects: 2, usedTags: 3 });
        expect(taggingStats.types.visualization).toStrictEqual({ taggedObjects: 3, usedTags: 2 });
      }
    );
  }
);
