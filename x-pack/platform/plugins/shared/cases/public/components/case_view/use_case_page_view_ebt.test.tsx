/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useCasePageViewEbt } from './use_case_page_view_ebt';
import { CASE_PAGE_VIEW_EVENT_TYPE, OBSERVABILITY_OWNER } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useWorkflowRunAvailability } from '../workflows/use_run_case_workflow';

// Mocks
jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../cases_context/use_cases_context', () => ({
  useCasesContext: jest.fn(),
}));

jest.mock('../workflows/use_run_case_workflow', () => ({
  useWorkflowRunAvailability: jest.fn(),
}));

const getMockServices = (reportEvent: jest.Mock) => ({
  services: {
    analytics: {
      reportEvent,
    },
  },
});

describe('useCasePageViewEbt', () => {
  beforeEach(() => {
    (useWorkflowRunAvailability as jest.Mock).mockReturnValue('available');
  });

  it('reports analytics event with valid owner and workflow availability', () => {
    const reportEvent = jest.fn();
    (useKibana as jest.Mock).mockReturnValue(getMockServices(reportEvent));
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [OBSERVABILITY_OWNER] });
    (useWorkflowRunAvailability as jest.Mock).mockReturnValue('available');

    renderHook(() => useCasePageViewEbt());

    expect(reportEvent).toHaveBeenCalledWith(CASE_PAGE_VIEW_EVENT_TYPE, {
      owner: OBSERVABILITY_OWNER,
      workflow_run_availability: 'available',
    });
  });

  it('reports analytics event with invalid owner', () => {
    const reportEvent = jest.fn();
    (useKibana as jest.Mock).mockReturnValue(getMockServices(reportEvent));
    (useCasesContext as jest.Mock).mockReturnValue({ owner: ['invalid'] });
    (useWorkflowRunAvailability as jest.Mock).mockReturnValue('no_execute_privilege');

    renderHook(() => useCasePageViewEbt());

    expect(reportEvent).toHaveBeenCalledWith(CASE_PAGE_VIEW_EVENT_TYPE, {
      owner: 'unknown',
      workflow_run_availability: 'no_execute_privilege',
    });
  });

  it('reports the blocking reason when the config flag is disabled', () => {
    const reportEvent = jest.fn();
    (useKibana as jest.Mock).mockReturnValue(getMockServices(reportEvent));
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [OBSERVABILITY_OWNER] });
    (useWorkflowRunAvailability as jest.Mock).mockReturnValue('config_disabled');

    renderHook(() => useCasePageViewEbt());

    expect(reportEvent).toHaveBeenCalledWith(CASE_PAGE_VIEW_EVENT_TYPE, {
      owner: OBSERVABILITY_OWNER,
      workflow_run_availability: 'config_disabled',
    });
  });
});
