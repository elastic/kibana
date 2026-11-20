/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import * as api from './api';
import { TestProviders } from '../common/mock';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import { useGetKpiMetrics } from './use_get_kpi_metrics';
import { useCasesConfig, useToasts } from '../common/lib/kibana';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const wrapper = ({ children }: React.PropsWithChildren<{}>) => (
  <TestProviders>{children}</TestProviders>
);

describe('useGetKpiMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCasesConfig as jest.Mock).mockReturnValue({ analyticsV2Enabled: true });
  });

  it('calls the api with the owner and the date range', async () => {
    const spyOnGetKpiMetrics = jest.spyOn(api, 'getKpiMetrics');

    renderHook(() => useGetKpiMetrics({ from: 'now-30d', to: 'now', enabled: true }), {
      wrapper,
    });

    await waitFor(() =>
      expect(spyOnGetKpiMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: SECURITY_SOLUTION_OWNER,
          from: 'now-30d',
          to: 'now',
        })
      )
    );
  });

  it('does not call the api when analytics v2 is disabled', async () => {
    (useCasesConfig as jest.Mock).mockReturnValue({ analyticsV2Enabled: false });
    const spyOnGetKpiMetrics = jest.spyOn(api, 'getKpiMetrics');

    const { result } = renderHook(() => useGetKpiMetrics({ enabled: true }), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(spyOnGetKpiMetrics).not.toHaveBeenCalled();
  });

  it('does not call the api when the list has no analytics metric', async () => {
    const spyOnGetKpiMetrics = jest.spyOn(api, 'getKpiMetrics');

    const { result } = renderHook(() => useGetKpiMetrics({ enabled: false }), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(spyOnGetKpiMetrics).not.toHaveBeenCalled();
  });

  it('displays an error toast when an error occurs', async () => {
    jest.spyOn(api, 'getKpiMetrics').mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    renderHook(() => useGetKpiMetrics({ enabled: true }), { wrapper });

    await waitFor(() => expect(addError).toHaveBeenCalled());
  });
});
