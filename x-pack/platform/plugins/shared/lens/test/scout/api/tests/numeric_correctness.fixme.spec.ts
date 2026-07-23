/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { apiTest } from '../fixtures';

/**
 * Follow-up stubs for exact numeric correctness currently asserted in Scout UI
 * (group5 formula / gauge / heatmap / geo migrations). Prefer ES|QL / search /
 * Lens expression evaluation APIs with a seeded Logstash archive over UI cell
 * text / chart debug-state values.
 *
 * Tracking: https://github.com/elastic/kibana/issues/276949
 *
 * UI sources (temporary parity holds until these land):
 * - formula/transition_and_crud.spec.ts — count `14,005`
 * - formula/layers_and_filters.spec.ts — moving average `222,420`; filter counts
 * - gauge_shapes.spec.ts — gauge debug value/target/domain
 * - heatmap_palette.spec.ts — legend stop keys/colors
 * - geo_field.spec.ts — Maps tooltip `Found 66 documents`
 */
apiTest.describe(
  'lens numeric correctness (group5 follow-up)',
  { tag: tags.stateful.classic },
  () => {
    // Seed Logstash + assert count(kql=*) / filtered counts via search or Lens API.
    apiTest.fixme('returns expected Logstash in-range formula counts', async ({ apiClient }) => {
      expect(apiClient).toBeDefined();
    });

    // Seed Logstash date_histogram + moving_average(sum(bytes), window=5); assert cell value.
    apiTest.fixme(
      'returns expected moving_average(sum(bytes), window=5) for Logstash in-range',
      async ({ apiClient }) => {
        expect(apiClient).toBeDefined();
      }
    );

    // Gauge metric/goal/min/max after edits — prefer API/expression over chart debugState.
    apiTest.fixme(
      'returns expected gauge metric target and domain after dimension edits',
      async ({ apiClient }) => {
        expect(apiClient).toBeDefined();
      }
    );

    // Heatmap temperature palette legend stop keys/colors for Top 5 of ip + avg bytes.
    apiTest.fixme(
      'returns expected heatmap legend stops for temperature palette on Logstash',
      async ({ apiClient }) => {
        expect(apiClient).toBeDefined();
      }
    );

    // Geo documents in Sep 22 2015 00:00–04:00 window — Maps tooltip currently asserts 66.
    apiTest.fixme(
      'returns expected geo document count for Logstash Sep 22 2015 4h window',
      async ({ apiClient }) => {
        expect(apiClient).toBeDefined();
      }
    );
  }
);
