/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { CaseStatuses } from '../../../common/types/domain';
import { getBuiltInStatuses } from '../../../common/utils/statuses';
import { useCasesConfig } from '../../common/lib/kibana';
import { useGetCaseConfigurationsQuery } from '../../containers/configure/use_get_case_configurations_query';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCaseStatuses } from './use_case_statuses';

jest.mock('../../common/lib/kibana');
jest.mock('../../containers/configure/use_get_case_configurations_query');
jest.mock('../cases_context/use_cases_context');

const awaitingCustomer = {
  key: 'awaiting_customer',
  label: 'Awaiting customer',
  category: CaseStatuses['in-progress'],
  order: 3,
  isDefault: false,
  disabled: false,
};
const retired = { ...awaitingCustomer, key: 'retired', label: 'Retired', disabled: true };
const securityStatuses = [
  ...getBuiltInStatuses().map((status) =>
    status.key === 'in-progress' ? { ...status, label: 'Investigating' } : status
  ),
  awaitingCustomer,
  retired,
];
const observabilityStatuses = [
  ...getBuiltInStatuses(),
  { ...awaitingCustomer, key: 'on_call', label: 'On call' },
];

const mockConfigurations = (configurations: Array<{ owner: string; statuses: unknown[] }>) => {
  (useGetCaseConfigurationsQuery as jest.Mock).mockImplementation(({ select }) => ({
    data: select(configurations),
    isLoading: false,
  }));
};

describe('useCaseStatuses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCasesConfig as jest.Mock).mockReturnValue({ customStatusesEnabled: true });
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [SECURITY_SOLUTION_OWNER] });
    mockConfigurations([
      { owner: SECURITY_SOLUTION_OWNER, statuses: securityStatuses },
      { owner: OBSERVABILITY_OWNER, statuses: observabilityStatuses },
    ]);
  });

  it('returns the configured statuses of the owner in context', () => {
    const { result } = renderHook(() => useCaseStatuses());

    expect(result.current.statuses.map((status) => status.key)).toEqual([
      'open',
      'in-progress',
      'awaiting_customer',
      'retired',
      'closed',
    ]);
    expect(result.current.isCustomStatusesEnabled).toBe(true);
  });

  it('leaves disabled statuses out of the enabled list', () => {
    const { result } = renderHook(() => useCaseStatuses());

    expect(result.current.enabledStatuses.map((status) => status.key)).not.toContain('retired');
  });

  it('falls back to the built-in statuses when custom statuses are disabled', () => {
    (useCasesConfig as jest.Mock).mockReturnValue({ customStatusesEnabled: false });
    const { result } = renderHook(() => useCaseStatuses());

    expect(result.current.statuses).toEqual(getBuiltInStatuses());
    expect(result.current.getStatus('awaiting_customer', CaseStatuses['in-progress']).label).toBe(
      'In progress'
    );
  });

  it('falls back to the built-in statuses when nothing is configured', () => {
    mockConfigurations([{ owner: SECURITY_SOLUTION_OWNER, statuses: [] }]);
    const { result } = renderHook(() => useCaseStatuses());

    expect(result.current.statuses).toEqual(getBuiltInStatuses());
  });

  it('unions the lists of every owner in context, first owner winning on shared keys', () => {
    (useCasesContext as jest.Mock).mockReturnValue({
      owner: [SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER],
    });
    const { result } = renderHook(() => useCaseStatuses());

    expect(result.current.statuses.map((status) => status.key)).toEqual([
      'open',
      'in-progress',
      'awaiting_customer',
      'retired',
      'on_call',
      'closed',
    ]);
    expect(result.current.getStatus('in-progress', CaseStatuses['in-progress']).label).toBe(
      'Investigating'
    );
  });

  describe('getStatus', () => {
    it('resolves a configured key', () => {
      const { result } = renderHook(() => useCaseStatuses());

      expect(result.current.getStatus('awaiting_customer', CaseStatuses['in-progress'])).toEqual(
        awaitingCustomer
      );
    });

    it('still resolves a disabled key so existing cases keep their label', () => {
      const { result } = renderHook(() => useCaseStatuses());

      expect(result.current.getStatus('retired', CaseStatuses['in-progress']).label).toBe(
        'Retired'
      );
    });

    it('falls back to the default status of the category for a missing or unknown key', () => {
      const { result } = renderHook(() => useCaseStatuses());

      expect(result.current.getStatus(null, CaseStatuses['in-progress']).label).toBe(
        'Investigating'
      );
      expect(result.current.getStatus('nope', CaseStatuses.closed).key).toBe('closed');
    });
  });
});
