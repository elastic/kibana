/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { CASES_WORKFLOW_RUN_TRIGGERED_EVENT_TYPE, OBSERVABILITY_OWNER } from '../../common/constants';
import {
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
} from '../../common/constants/workflow';
import { useKibana } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { useGetCaseConfiguration } from '../containers/configure/use_get_case_configuration';
import {
  useWorkflowRunTriggeredEBT,
  getWorkflowRunOriginType,
} from './use_workflow_run_ebt';

jest.mock('../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../components/cases_context/use_cases_context', () => ({
  useCasesContext: jest.fn(),
}));

jest.mock('../containers/configure/use_get_case_configuration', () => ({
  useGetCaseConfiguration: jest.fn(),
}));

const getMockServices = (reportEvent: jest.Mock) => ({
  services: {
    analytics: { reportEvent },
  },
});

describe('useWorkflowRunTriggeredEBT', () => {
  const reportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue(getMockServices(reportEvent));
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [OBSERVABILITY_OWNER] });
    (useGetCaseConfiguration as jest.Mock).mockReturnValue({ data: { workflowTags: [] } });
  });

  it('reports a triggered event with origin type and case count', () => {
    const { result } = renderHook(() => useWorkflowRunTriggeredEBT());

    act(() => {
      result.current({ originType: CASE_WORKFLOW_ORIGIN_TYPE, caseCount: 1 });
    });

    expect(reportEvent).toHaveBeenCalledWith(CASES_WORKFLOW_RUN_TRIGGERED_EVENT_TYPE, {
      owner: OBSERVABILITY_OWNER,
      origin_type: CASE_WORKFLOW_ORIGIN_TYPE,
      case_count: 1,
      tag_filter_active: false,
    });
  });

  it('reports tag_filter_active: true when workflow tags are configured', () => {
    (useGetCaseConfiguration as jest.Mock).mockReturnValue({
      data: { workflowTags: ['tier-1', 'soar'] },
    });

    const { result } = renderHook(() => useWorkflowRunTriggeredEBT());

    act(() => {
      result.current({ originType: 'bulk', caseCount: 5 });
    });

    expect(reportEvent).toHaveBeenCalledWith(
      CASES_WORKFLOW_RUN_TRIGGERED_EVENT_TYPE,
      expect.objectContaining({ tag_filter_active: true, case_count: 5, origin_type: 'bulk' })
    );
  });

  it('resolves unknown owners to "unknown"', () => {
    (useCasesContext as jest.Mock).mockReturnValue({ owner: ['not-a-valid-owner'] });

    const { result } = renderHook(() => useWorkflowRunTriggeredEBT());

    act(() => {
      result.current({ originType: ALERTS_WORKFLOW_ORIGIN_TYPE, caseCount: 3 });
    });

    expect(reportEvent).toHaveBeenCalledWith(
      CASES_WORKFLOW_RUN_TRIGGERED_EVENT_TYPE,
      expect.objectContaining({ owner: 'unknown' })
    );
  });

  it.each([
    CASE_WORKFLOW_ORIGIN_TYPE,
    OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
    OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
    ALERT_WORKFLOW_ORIGIN_TYPE,
    ALERTS_WORKFLOW_ORIGIN_TYPE,
    'bulk' as const,
  ])('accepts origin_type: %s', (originType) => {
    const { result } = renderHook(() => useWorkflowRunTriggeredEBT());

    act(() => {
      result.current({ originType, caseCount: 1 });
    });

    expect(reportEvent).toHaveBeenCalledWith(
      CASES_WORKFLOW_RUN_TRIGGERED_EVENT_TYPE,
      expect.objectContaining({ origin_type: originType })
    );
  });
});

describe('getWorkflowRunOriginType', () => {
  it('returns the origin type when origin is present', () => {
    expect(
      getWorkflowRunOriginType({ type: CASE_WORKFLOW_ORIGIN_TYPE, caseId: 'c1' })
    ).toBe(CASE_WORKFLOW_ORIGIN_TYPE);
  });

  it('returns "bulk" when origin is undefined', () => {
    expect(getWorkflowRunOriginType(undefined)).toBe('bulk');
  });
});
