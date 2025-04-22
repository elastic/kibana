/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { useGetCaseConfiguration } from './use_get_case_configuration';
import * as api from './api';

import { TestProviders, mockedTestProvidersOwner } from '../../common/mock';
import { initialConfiguration } from './utils';
import React from 'react';

jest.mock('./api');

describe('Use get case configuration hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a configuration matching the owner', async () => {
    const spy = jest.spyOn(api, 'getCaseConfigure');
    const targetConfiguration = {
      ...initialConfiguration,
      id: 'my-new-configuration-3',
      owner: mockedTestProvidersOwner[0], // used in the AppMockRenderer
    };
    spy.mockResolvedValue([
      { ...initialConfiguration, id: 'my-new-configuration-1', owner: 'foo' },
      { ...initialConfiguration, id: 'my-new-configuration-2', owner: 'bar' },
      targetConfiguration,
    ]);

    const { result } = renderHook(() => useGetCaseConfiguration(), {
      wrapper: TestProviders,
    });

    /**
     * The response after fetching
     */
    await waitFor(() => expect(result.current.data).toEqual(targetConfiguration));
  });

  it('returns the initial configuration if none matches the owner', async () => {
    const spy = jest.spyOn(api, 'getCaseConfigure');
    const targetConfiguration = {
      ...initialConfiguration,
      id: 'my-new-configuration-1',
      owner: 'foo',
    };
    spy.mockResolvedValue([
      targetConfiguration,
      { ...initialConfiguration, id: 'my-new-configuration-2', owner: 'bar' },
    ]);

    const { result } = renderHook(() => useGetCaseConfiguration(), {
      wrapper: TestProviders,
    });

    /**
     * The response after fetching
     */
    await waitFor(() => expect(result.current.data).toEqual(initialConfiguration));
  });

  it('returns the initial configuration if none exists', async () => {
    const spy = jest.spyOn(api, 'getCaseConfigure');

    spy.mockResolvedValue([]);

    const { result } = renderHook(() => useGetCaseConfiguration(), {
      wrapper: TestProviders,
    });

    /**
     * The response after fetching
     */
    await waitFor(() => expect(result.current.data).toEqual(initialConfiguration));
  });

  it('returns the initial configuration if the owner is undefined', async () => {
    const spy = jest.spyOn(api, 'getCaseConfigure');

    spy.mockResolvedValue([]);

    const { result } = renderHook(() => useGetCaseConfiguration(), {
      wrapper: (props) => <TestProviders {...props} owner={[]} />,
    });

    /**
     * The response after fetching
     */
    await waitFor(() => expect(result.current.data).toEqual(initialConfiguration));
  });
});
