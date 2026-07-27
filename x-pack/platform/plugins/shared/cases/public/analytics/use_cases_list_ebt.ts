/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';

import {
  CASES_LIST_PAGE_VIEW_EVENT_TYPE,
  CASES_LIST_VIEW_MODE_CHANGED_EVENT_TYPE,
} from '../../common/constants';
import type { ViewToggleId } from '../components/cases_redesign/all_cases/constants';
import { useKibana } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { isRegisteredOwner } from '../files';

const getEbtOwner = (owner: string[]): string =>
  owner[0] && isRegisteredOwner(owner[0]) ? owner[0] : 'unknown';

/**
 * Events Based Tracking for switching between the cases list "list" and "table" view modes
 */
export const useCasesListViewModeChangedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    (viewMode: ViewToggleId) => {
      analytics.reportEvent(CASES_LIST_VIEW_MODE_CHANGED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        view_mode: viewMode,
      });
    },
    [analytics, owner]
  );
};

export interface UseCasesListPageViewEBTArgs {
  /** The active view mode ("list" or "table") at the time the page loaded */
  viewMode: ViewToggleId;
  /** The columns (table view) or fields (list view) currently selected for display */
  selectedColumns: string[];
  /** The number of rows selected per page */
  perPage: number;
  /** Whether asynchronously loaded list configuration is ready to report */
  isReady?: boolean;
  /**
   * Set to `false` to skip reporting, e.g. when the list is rendered inside the
   * "add to existing case" selector modal rather than as the main cases list page.
   */
  enabled?: boolean;
}

/**
 * Events Based Tracking for the cases list page load. Reports the view mode, selected
 * columns/fields, and page size that were active at load time.
 */
export const useCasesListPageViewEBT = ({
  viewMode,
  selectedColumns,
  perPage,
  isReady = true,
  enabled = true,
}: UseCasesListPageViewEBTArgs) => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();
  const hasReportedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isReady || hasReportedRef.current) {
      return;
    }

    hasReportedRef.current = true;
    analytics.reportEvent(CASES_LIST_PAGE_VIEW_EVENT_TYPE, {
      owner: getEbtOwner(owner),
      view_mode: viewMode,
      selected_columns: selectedColumns,
      per_page: perPage,
    });
  }, [analytics, enabled, isReady, owner, perPage, selectedColumns, viewMode]);
};
