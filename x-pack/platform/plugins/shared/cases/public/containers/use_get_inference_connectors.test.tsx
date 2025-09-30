/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import * as api from './api';
import { TestProviders } from '../common/mock';
import { useToasts } from '../common/lib/kibana';
import { useGetInferenceConnectors } from './use_get_inference_connectors';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <TestProviders>{children}</TestProviders>
);

describe('useGetInferenceConnectors', () => {
  const abortCtrl = new AbortController();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls getInferenceConnectors with correct arguments', async () => {
    const spyOnGetInferenceConnectors = jest.spyOn(api, 'getInferenceConnectors');

    renderHook(() => useGetInferenceConnectors(), {
      wrapper,
    });

    await waitFor(() => expect(spyOnGetInferenceConnectors).toBeCalledWith(abortCtrl.signal));
  });

  it('shows an error toast when getInferenceConnectors throws', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const spyOnGetInferenceConnectors = jest.spyOn(api, 'getInferenceConnectors');
    spyOnGetInferenceConnectors.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    renderHook(() => useGetInferenceConnectors(), {
      wrapper,
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });
});
