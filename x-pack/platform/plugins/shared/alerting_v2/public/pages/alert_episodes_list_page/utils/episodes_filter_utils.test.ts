/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_EPISODES_LIST_FILTER } from './episodes_list_url_state';
import {
  getEpisodesToolbarStatusKind,
  isDefaultActiveAlertsView,
  isViewAllAlertsScope,
  shouldShowToolbarReset,
} from './episodes_filter_utils';

describe('episodes_filter_utils', () => {
  describe('isDefaultActiveAlertsView', () => {
    it('returns true for the default active alerts scope', () => {
      expect(isDefaultActiveAlertsView(DEFAULT_EPISODES_LIST_FILTER)).toBe(true);
    });

    it('returns false when Total (view all) is selected', () => {
      expect(
        isDefaultActiveAlertsView({
          ...DEFAULT_EPISODES_LIST_FILTER,
          alertsKpi: 'total',
          status: undefined,
        })
      ).toBe(false);
    });
  });

  describe('isViewAllAlertsScope', () => {
    it('returns true for the Total KPI', () => {
      expect(
        isViewAllAlertsScope({
          alertsKpi: 'total',
          status: undefined,
        })
      ).toBe(true);
    });
  });

  describe('getEpisodesToolbarStatusKind', () => {
    it('uses active_alerts on first visit', () => {
      expect(getEpisodesToolbarStatusKind(DEFAULT_EPISODES_LIST_FILTER)).toBe('active_alerts');
    });

    it('uses view_all for the Total KPI without narrowing filters', () => {
      expect(
        getEpisodesToolbarStatusKind({
          alertsKpi: 'total',
          status: undefined,
        })
      ).toBe('view_all');
    });

    it('uses active_alerts when search narrows the default active scope', () => {
      expect(
        getEpisodesToolbarStatusKind({
          ...DEFAULT_EPISODES_LIST_FILTER,
          queryString: 'error',
        })
      ).toBe('active_alerts');
    });
  });

  describe('shouldShowToolbarReset', () => {
    it('shows reset on the default active view', () => {
      expect(shouldShowToolbarReset(DEFAULT_EPISODES_LIST_FILTER)).toBe(true);
    });

    it('hides reset when view all (Total) is selected', () => {
      expect(
        shouldShowToolbarReset({
          alertsKpi: 'total',
          status: undefined,
        })
      ).toBe(false);
    });

    it('hides reset on view all even when search is applied', () => {
      expect(
        shouldShowToolbarReset({
          alertsKpi: 'total',
          status: undefined,
          queryString: 'error',
        })
      ).toBe(false);
    });

    it('shows reset when Active alerts is selected with narrowing filters', () => {
      expect(
        shouldShowToolbarReset({
          ...DEFAULT_EPISODES_LIST_FILTER,
          ruleId: 'rule-1',
        })
      ).toBe(true);
    });

    it('hides reset when high severity is selected', () => {
      expect(
        shouldShowToolbarReset({
          ...DEFAULT_EPISODES_LIST_FILTER,
          alertsKpi: 'high_severity',
          highSeverityOnly: true,
        })
      ).toBe(false);
    });
  });
});
