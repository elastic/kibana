/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  CASES_LIST_PAGE_VIEW_EVENT_TYPE,
  CASES_LIST_VIEW_MODE_CHANGED_EVENT_TYPE,
  SECURITY_SOLUTION_OWNER,
} from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import {
  VIEW_TOGGLE_LIST_ID,
  VIEW_TOGGLE_TABLE_ID,
} from '../components/cases_redesign/all_cases/constants';
import { useCasesListPageViewEBT, useCasesListViewModeChangedEBT } from './use_cases_list_ebt';

jest.mock('../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../components/cases_context/use_cases_context', () => ({
  useCasesContext: jest.fn(),
}));

const getMockServices = (reportEvent: jest.Mock) => ({
  services: {
    analytics: {
      reportEvent,
    },
  },
});

describe('cases list EBT hooks', () => {
  const reportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue(getMockServices(reportEvent));
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [SECURITY_SOLUTION_OWNER] });
  });

  describe('useCasesListViewModeChangedEBT', () => {
    it('reports the selected view mode with the owner', () => {
      const { result } = renderHook(() => useCasesListViewModeChangedEBT());

      result.current(VIEW_TOGGLE_LIST_ID);

      expect(reportEvent).toHaveBeenCalledWith(CASES_LIST_VIEW_MODE_CHANGED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        view_mode: VIEW_TOGGLE_LIST_ID,
      });
    });
  });

  describe('useCasesListPageViewEBT', () => {
    it('reports the page view payload with an unknown owner fallback', () => {
      (useCasesContext as jest.Mock).mockReturnValue({ owner: ['invalid'] });

      renderHook(() =>
        useCasesListPageViewEBT({
          viewMode: VIEW_TOGGLE_TABLE_ID,
          selectedColumns: ['title', 'status'],
          perPage: 25,
        })
      );

      expect(reportEvent).toHaveBeenCalledWith(CASES_LIST_PAGE_VIEW_EVENT_TYPE, {
        owner: 'unknown',
        view_mode: VIEW_TOGGLE_TABLE_ID,
        selected_columns: ['title', 'status'],
        per_page: 25,
      });
    });

    it('does not report when disabled', () => {
      renderHook(() =>
        useCasesListPageViewEBT({
          viewMode: VIEW_TOGGLE_TABLE_ID,
          selectedColumns: ['title'],
          perPage: 10,
          enabled: false,
        })
      );

      expect(reportEvent).not.toHaveBeenCalled();
    });

    it('waits for configuration and reports the latest payload only once', () => {
      const { rerender } = renderHook(
        ({ isReady, selectedColumns }: { isReady: boolean; selectedColumns: string[] }) =>
          useCasesListPageViewEBT({
            viewMode: VIEW_TOGGLE_TABLE_ID,
            selectedColumns,
            perPage: 10,
            isReady,
          }),
        {
          initialProps: {
            isReady: false,
            selectedColumns: ['title'],
          },
        }
      );

      expect(reportEvent).not.toHaveBeenCalled();

      rerender({
        isReady: true,
        selectedColumns: ['title', 'custom-field'],
      });

      expect(reportEvent).toHaveBeenCalledWith(CASES_LIST_PAGE_VIEW_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        view_mode: VIEW_TOGGLE_TABLE_ID,
        selected_columns: ['title', 'custom-field'],
        per_page: 10,
      });

      rerender({
        isReady: true,
        selectedColumns: ['title', 'status', 'custom-field'],
      });

      expect(reportEvent).toHaveBeenCalledTimes(1);
    });
  });
});
