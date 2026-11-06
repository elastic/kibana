/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTIVITY_INDEX_NAME, ATTACHMENTS_INDEX_NAME, CASE_INDEX_NAME } from '../constants';
import {
  CASE_ANALYTICS_DATA_VIEW_TITLE,
  CASE_DATA_VIEW_ID_PREFIX,
  buildCaseDataViewSpec,
  getCaseDataViewId,
} from './data_view_specs';

/**
 * Guards for the managed Cases-analytics data view spec. The service test
 * (`service.test.ts`) covers the bootstrap/refresh lifecycle; this file
 * pins the pure spec shape — most importantly that the single managed
 * view spans `.cases-attachments` so the attachments surface is queryable
 * from Discover / Lens / ES|QL alongside `.cases` and `.cases-activity`.
 */
describe('data view specs', () => {
  describe('CASE_ANALYTICS_DATA_VIEW_TITLE', () => {
    it('spans all three analytics indices (comma-separated index pattern)', () => {
      const tokens = CASE_ANALYTICS_DATA_VIEW_TITLE.split(',');
      // Order matters for readability (cases first as the dimension table)
      // but the assertion pins membership so a dropped surface is caught.
      expect(tokens).toEqual([CASE_INDEX_NAME, ACTIVITY_INDEX_NAME, ATTACHMENTS_INDEX_NAME]);
    });

    it('includes the attachments index so the surface is queryable via the managed view', () => {
      // Regression guard for the attachments surface being added to the
      // shared view — without this token the `.cases-attachments` docs
      // land in ES but no managed data view resolves them.
      expect(CASE_ANALYTICS_DATA_VIEW_TITLE).toContain(ATTACHMENTS_INDEX_NAME);
    });
  });

  describe('getCaseDataViewId', () => {
    it('derives a deterministic, space-suffixed id from the shared prefix', () => {
      expect(getCaseDataViewId('default')).toBe(`${CASE_DATA_VIEW_ID_PREFIX}default`);
      expect(getCaseDataViewId('team-a')).toBe(`${CASE_DATA_VIEW_ID_PREFIX}team-a`);
    });
  });

  describe('buildCaseDataViewSpec', () => {
    it('builds a per-space, time-based, managed spec titled with all three indices', () => {
      const spec = buildCaseDataViewSpec('team-a');

      expect(spec).toMatchObject({
        id: getCaseDataViewId('team-a'),
        title: CASE_ANALYTICS_DATA_VIEW_TITLE,
        timeFieldName: '@timestamp',
        allowNoIndex: true,
        managed: true,
        // Space-scoped: templates are space SOs, so the derived runtime
        // field map is too — a global view would leak fields across spaces.
        namespaces: ['team-a'],
      });
      // Runtime fields are layered on later by the data view service.
      expect(spec.runtimeFieldMap).toEqual({});
    });
  });
});
