/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetCase } from './use_get_case';
import * as api from './api';
import { waitFor, renderHook } from '@testing-library/react';
import { useToasts } from '../common/lib/kibana';
import { TestProviders } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');

// Failing: See https://github.com/elastic/kibana/issues/189634
describe('Use get case hook', () => {
  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'resolveCase');
    renderHook(() => useGetCase('case-1'), { wrapper: TestProviders });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({
        caseId: 'case-1',
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('shows a toast error when the api return an error', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });
    jest.spyOn(api, 'resolveCase').mockRejectedValue(new Error("C'est la vie"));

    renderHook(() => useGetCase('case-1'), { wrapper: TestProviders });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });
});
