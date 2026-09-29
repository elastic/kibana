/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { waitFor, renderHook } from '@testing-library/react';

import { useKibana, useToasts } from '../../../common/lib/kibana';
import { connector as actionConnector } from '../mock';
import { useGetIssues } from './use_get_issues';
import * as api from './api';
import { TestProviders } from '../../../common/mock';

vi.mock('../../../common/lib/kibana');
vi.mock('./api');

const useKibanaMock = useKibana as Mocked<typeof useKibana>;

describe('useGetIssues', () => {
  const { http } = useKibanaMock().services;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = vi.spyOn(api, 'getIssues');
    const { result } = renderHook(
      () =>
        useGetIssues({
          http,
          actionConnector,
          query: 'Task',
        }),
      { wrapper: TestProviders }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(spy).toHaveBeenCalledWith({
      http,
      signal: expect.anything(),
      connectorId: actionConnector.id,
      title: 'Task',
    });
  });

  it('does not call the api when the connector is missing', async () => {
    const spy = vi.spyOn(api, 'getIssues');
    renderHook(
      () =>
        useGetIssues({
          http,
          actionConnector,
          query: 'Task',
        }),
      { wrapper: TestProviders }
    );

    expect(spy).not.toHaveBeenCalledWith();
  });

  it('calls addError when the getIssues api throws an error', async () => {
    const spyOnGetCases = vi.spyOn(api, 'getIssues');
    spyOnGetCases.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = vi.fn();
    (useToasts as Mock).mockReturnValue({ addSuccess: vi.fn(), addError });

    const { result } = renderHook(
      () =>
        useGetIssues({
          http,
          actionConnector,
          query: 'Task',
        }),
      { wrapper: TestProviders }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(addError).toHaveBeenCalled();
  });

  it('calls addError when the getIssues api returns successfully but contains an error', async () => {
    const spyOnGetCases = vi.spyOn(api, 'getIssues');
    spyOnGetCases.mockResolvedValue({
      status: 'error',
      message: 'Error message',
      actionId: 'test',
    });

    const addError = vi.fn();
    (useToasts as Mock).mockReturnValue({ addSuccess: vi.fn(), addError });

    const { result } = renderHook(
      () =>
        useGetIssues({
          http,
          actionConnector,
          query: 'Task',
        }),
      { wrapper: TestProviders }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(addError).toHaveBeenCalled();
  });
});
