/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, spaceTest } from '@kbn/scout';
import {
  deleteFarequoteDataView,
  ensureFarequoteDataView,
  expectSearchDeletedOnCancel,
  expectSearchDeletedOnNavigate,
  STALLING_FILTER,
  TIME_RANGE,
} from '../fixtures/embeddable_cancellation';

spaceTest.describe(
  'pattern analysis embedded in dashboard - request cancellation',
  { tag: tags.stateful.classic },
  () => {
    let dashboardId: string;

    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      const dataViewId = await ensureFarequoteDataView(apiServices, scoutSpace.id);

      dashboardId = await apiServices.dashboard.create(
        {
          title: `Pattern analysis cancellation ${Date.now()}`,
          time_range: { ...TIME_RANGE, mode: 'absolute' },
          panels: [
            {
              type: 'aiops_pattern_analysis',
              grid: { x: 0, y: 0, w: 24, h: 15 },
              config: {
                data_view_id: dataViewId,
                field_name: 'type',
                minimum_time_range: 'no_minimum',
                random_sampler_mode: 'off',
                random_sampler_probability: null,
              },
            },
          ],
          filters: [STALLING_FILTER],
        },
        scoutSpace.id
      );
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
      await deleteFarequoteDataView(apiServices, scoutSpace.id);
    });

    spaceTest(
      'cancels in-flight searches when navigating away from the dashboard',
      async ({ page, pageObjects }) => {
        await expectSearchDeletedOnNavigate(page, pageObjects, dashboardId);
      }
    );

    spaceTest(
      'cancels in-flight searches when clicking the cancel button',
      async ({ page, pageObjects }) => {
        await expectSearchDeletedOnCancel(page, pageObjects, dashboardId);
      }
    );
  }
);
