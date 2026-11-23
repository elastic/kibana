/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { KibanaServices } from '../../../../common/lib/kibana';
import { TestProviders } from '../../../../common/mock';
import * as api from '../../../../containers/api';
import { useGetCaseDelta } from './use_get_case_delta';

jest.mock('../../../../containers/api');
jest.mock('../../../../common/lib/kibana');

const getConfigMock = jest.mocked(KibanaServices.getConfig);
const recordCaseViewSpy = jest.spyOn(api, 'recordCaseView');
const getCaseDeltaSpy = jest.spyOn(api, 'getCaseDelta');

describe('useGetCaseDelta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records the view before it loads the delta', async () => {
    const { result } = renderHook(() => useGetCaseDelta('case-1'), { wrapper: TestProviders });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(recordCaseViewSpy).toHaveBeenCalledTimes(1);
    expect(getCaseDeltaSpy).toHaveBeenCalledTimes(1);
    expect(recordCaseViewSpy.mock.invocationCallOrder[0]).toBeLessThan(
      getCaseDeltaSpy.mock.invocationCallOrder[0]
    );
  });

  it('shares one view record between components', async () => {
    renderHook(
      () => {
        useGetCaseDelta('case-1');
        return useGetCaseDelta('case-1');
      },
      { wrapper: TestProviders }
    );

    await waitFor(() => expect(getCaseDeltaSpy).toHaveBeenCalled());

    expect(recordCaseViewSpy).toHaveBeenCalledTimes(1);
  });

  it('makes no request when the delta view is disabled', async () => {
    getConfigMock.mockReturnValue({ deltaView: { enabled: false } } as never);

    const { result } = renderHook(() => useGetCaseDelta('case-1'), { wrapper: TestProviders });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));

    expect(recordCaseViewSpy).not.toHaveBeenCalled();
    expect(getCaseDeltaSpy).not.toHaveBeenCalled();
    getConfigMock.mockReturnValue(null as never);
  });
});
