/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  CASES_OBSERVABLES_EXTRACTED_EVENT_TYPE,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import { useObservablesExtractedEBT } from './use_observables_extracted_ebt';

jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../components/cases_context/use_cases_context', () => ({
  useCasesContext: jest.fn(),
}));

describe('useObservablesExtractedEBT', () => {
  const reportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({ services: { analytics: { reportEvent } } });
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [SECURITY_SOLUTION_OWNER] });
  });

  it('reports the owner, the status, and the count of new observables', () => {
    const { result } = renderHook(() => useObservablesExtractedEBT());

    result.current({ status: 'extracted', newObservablesCount: 3 });

    expect(reportEvent).toHaveBeenCalledTimes(1);
    expect(reportEvent).toHaveBeenCalledWith(CASES_OBSERVABLES_EXTRACTED_EVENT_TYPE, {
      owner: SECURITY_SOLUTION_OWNER,
      status: 'extracted',
      new_observables_count: 3,
    });
  });

  it('reports an outcome without new observables with a zero count', () => {
    const { result } = renderHook(() => useObservablesExtractedEBT());

    result.current({ status: 'no_new_observables', newObservablesCount: 0 });

    expect(reportEvent).toHaveBeenCalledWith(CASES_OBSERVABLES_EXTRACTED_EVENT_TYPE, {
      owner: SECURITY_SOLUTION_OWNER,
      status: 'no_new_observables',
      new_observables_count: 0,
    });
  });

  it('reports a distinct owner', () => {
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [OBSERVABILITY_OWNER] });
    const { result } = renderHook(() => useObservablesExtractedEBT());

    result.current({ status: 'cap_reached', newObservablesCount: 0 });

    expect(reportEvent).toHaveBeenCalledWith(
      CASES_OBSERVABLES_EXTRACTED_EVENT_TYPE,
      expect.objectContaining({ owner: OBSERVABILITY_OWNER, status: 'cap_reached' })
    );
  });

  it('does not report anything when the hook only renders', () => {
    renderHook(() => useObservablesExtractedEBT());

    expect(reportEvent).not.toHaveBeenCalled();
  });
});
