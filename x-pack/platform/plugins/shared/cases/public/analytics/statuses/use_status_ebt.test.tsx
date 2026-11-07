/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  CASES_STATUS_CHANGED_EVENT_TYPE,
  CASES_STATUS_CONFIGURATION_EDITED_EVENT_TYPE,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import { CaseStatuses } from '../../../common/types/domain';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import { useStatusChangedEBT, useStatusConfigurationEditedEBT } from './use_status_ebt';

jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../components/cases_context/use_cases_context', () => ({
  useCasesContext: jest.fn(),
}));

describe('status EBT hooks', () => {
  const reportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({ services: { analytics: { reportEvent } } });
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [SECURITY_SOLUTION_OWNER] });
  });

  describe('useStatusChangedEBT', () => {
    it('reports the category, whether the status is custom, and the entry point', () => {
      const { result } = renderHook(() => useStatusChangedEBT());

      result.current({
        category: CaseStatuses['in-progress'],
        isCustom: true,
        entryPoint: 'case_view_header',
      });

      expect(reportEvent).toHaveBeenCalledTimes(1);
      expect(reportEvent).toHaveBeenCalledWith(CASES_STATUS_CHANGED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        category: 'in-progress',
        is_custom: true,
        entry_point: 'case_view_header',
        pauses_time_tracking: false,
      });
    });

    it('reports a pause with whether the reason is one of the defaults, never the reason itself', () => {
      const { result } = renderHook(() => useStatusChangedEBT());

      result.current({
        category: CaseStatuses['in-progress'],
        isCustom: true,
        entryPoint: 'case_view_header',
        pausesTimeTracking: true,
        pauseReason: 'Waiting on legal',
      });

      expect(reportEvent).toHaveBeenCalledWith(
        CASES_STATUS_CHANGED_EVENT_TYPE,
        expect.objectContaining({ pauses_time_tracking: true, pause_reason: 'custom' })
      );
      expect(JSON.stringify(reportEvent.mock.calls)).not.toContain('Waiting on legal');
    });

    it('reports the owner from the cases context', () => {
      (useCasesContext as jest.Mock).mockReturnValue({ owner: [OBSERVABILITY_OWNER] });
      const { result } = renderHook(() => useStatusChangedEBT());

      result.current({
        category: CaseStatuses.closed,
        isCustom: false,
        entryPoint: 'list_bulk_action',
      });

      expect(reportEvent).toHaveBeenCalledWith(
        CASES_STATUS_CHANGED_EVENT_TYPE,
        expect.objectContaining({ owner: OBSERVABILITY_OWNER })
      );
    });
  });

  describe('useStatusConfigurationEditedEBT', () => {
    it('reports the category and the action without any label or key', () => {
      const { result } = renderHook(() => useStatusConfigurationEditedEBT());

      result.current({ category: CaseStatuses.open, action: 'added' });

      expect(reportEvent).toHaveBeenCalledTimes(1);
      expect(reportEvent).toHaveBeenCalledWith(CASES_STATUS_CONFIGURATION_EDITED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        category: 'open',
        action: 'added',
      });
    });
  });
});
