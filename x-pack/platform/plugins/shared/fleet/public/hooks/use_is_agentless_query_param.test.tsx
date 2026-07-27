/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderHook } from '@testing-library/react';

import { allowedExperimentalValues } from '../../common/experimental_features';
import { ExperimentalFeaturesService } from '../services';

import { useIsAgentlessQueryParam } from './use_is_agentless_query_param';

const renderWithSearch = (search: string) =>
  renderHook(() => useIsAgentlessQueryParam(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[{ pathname: '/', search }]}>{children}</MemoryRouter>
    ),
  });

describe('useIsAgentlessQueryParam', () => {
  beforeEach(() => {
    ExperimentalFeaturesService.init(allowedExperimentalValues);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns true when the isAgentless param is set and the agentless policies UI is enabled', () => {
    const { result } = renderWithSearch('?isAgentless=true');
    expect(result.current).toBe(true);
  });

  it('returns false when the isAgentless param is absent', () => {
    const { result } = renderWithSearch('');
    expect(result.current).toBe(false);
  });

  it('returns false when the isAgentless param is not "true"', () => {
    const { result } = renderWithSearch('?isAgentless=false');
    expect(result.current).toBe(false);
  });

  it('ignores the isAgentless param when the agentless policies UI is disabled', () => {
    jest.spyOn(ExperimentalFeaturesService, 'get').mockReturnValue({
      ...allowedExperimentalValues,
      enableAgentlessPoliciesUI: false,
    });
    const { result } = renderWithSearch('?isAgentless=true');
    expect(result.current).toBe(false);
  });
});
