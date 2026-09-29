/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import type { SingleCaseMetricsFeature } from '../../common/ui';
import { useGetCaseMetrics } from './use_get_case_metrics';
import { basicCase } from './mock';
import * as api from './api';
import { TestProviders } from '../common/mock';
import { useToasts } from '../common/lib/kibana';
import { CaseMetricsFeature } from '../../common/types/api';

vi.mock('./api');
vi.mock('../common/lib/kibana');

const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <TestProviders>{children}</TestProviders>
);

describe('useGetCaseMetrics', () => {
  const abortCtrl = new AbortController();
  const features: SingleCaseMetricsFeature[] = [CaseMetricsFeature.ALERTS_COUNT];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getSingleCaseMetrics with correct arguments', async () => {
    const spyOnGetCaseMetrics = vi.spyOn(api, 'getSingleCaseMetrics');

    renderHook(() => useGetCaseMetrics(basicCase.id, features), {
      wrapper,
    });

    await waitFor(() =>
      expect(spyOnGetCaseMetrics).toHaveBeenCalledWith(basicCase.id, features, abortCtrl.signal)
    );
  });

  it('shows an error toast when getSingleCaseMetrics throws', async () => {
    const addError = vi.fn();
    (useToasts as Mock).mockReturnValue({ addError });

    const spyOnGetCaseMetrics = vi.spyOn(api, 'getSingleCaseMetrics');
    spyOnGetCaseMetrics.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    renderHook(() => useGetCaseMetrics(basicCase.id, features), {
      wrapper,
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });
});
