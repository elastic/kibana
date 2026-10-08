/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  CASES_OBSERVABLES_DELETED_EVENT_TYPE,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import { useObservablesDeletedEBT } from './use_observables_deleted_ebt';

jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../components/cases_context/use_cases_context', () => ({
  useCasesContext: jest.fn(),
}));

const getMockServices = (reportEvent: jest.Mock) => ({
  services: {
    analytics: {
      reportEvent,
    },
  },
});

describe('useObservablesDeletedEBT', () => {
  const reportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue(getMockServices(reportEvent));
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [SECURITY_SOLUTION_OWNER] });
  });

  it('reports a single delete with the owner', () => {
    const { result } = renderHook(() => useObservablesDeletedEBT());

    result.current({ deleteScope: 'single' });

    expect(reportEvent).toHaveBeenCalledWith(CASES_OBSERVABLES_DELETED_EVENT_TYPE, {
      owner: SECURITY_SOLUTION_OWNER,
      delete_scope: 'single',
    });
  });

  it('reports a bulk delete once, with a distinct scope', () => {
    const { result } = renderHook(() => useObservablesDeletedEBT());

    result.current({ deleteScope: 'bulk' });

    expect(reportEvent).toHaveBeenCalledTimes(1);
    expect(reportEvent).toHaveBeenCalledWith(CASES_OBSERVABLES_DELETED_EVENT_TYPE, {
      owner: SECURITY_SOLUTION_OWNER,
      delete_scope: 'bulk',
    });
  });

  it('reports a distinct owner', () => {
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [OBSERVABILITY_OWNER] });
    const { result } = renderHook(() => useObservablesDeletedEBT());

    result.current({ deleteScope: 'single' });

    expect(reportEvent).toHaveBeenCalledWith(CASES_OBSERVABLES_DELETED_EVENT_TYPE, {
      owner: OBSERVABILITY_OWNER,
      delete_scope: 'single',
    });
  });

  it('falls back to unknown owner when the owner is not recognised', () => {
    (useCasesContext as jest.Mock).mockReturnValue({ owner: ['invalid'] });
    const { result } = renderHook(() => useObservablesDeletedEBT());

    result.current({ deleteScope: 'single' });

    expect(reportEvent).toHaveBeenCalledWith(CASES_OBSERVABLES_DELETED_EVENT_TYPE, {
      owner: 'unknown',
      delete_scope: 'single',
    });
  });

  it('does not report anything when the hook only renders', () => {
    renderHook(() => useObservablesDeletedEBT());

    expect(reportEvent).not.toHaveBeenCalled();
  });
});
