/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';

import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';
import { TestProviders, createTestQueryClient } from '../../../common/mock';
import { useGetTemplate } from './use_get_template';
import { casesQueriesKeys } from '../../../containers/constants';
import * as api from '../api/api';

jest.mock('../api/api');

const apiMock = api as jest.Mocked<typeof api>;

const mockTemplate: ParsedTemplate = {
  templateId: 'template-1',
  name: 'My template',
  owner: 'securitySolution',
  definition: { name: 'My template', fields: [] },
  templateVersion: 3,
  deletedAt: null,
  isLatest: true,
  latestVersion: 3,
};

describe('useGetTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiMock.getTemplate.mockResolvedValue(mockTemplate);
  });

  it('fetches a template by id', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useGetTemplate('template-1'), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiMock.getTemplate).toHaveBeenCalledWith({
      templateId: 'template-1',
      version: undefined,
      signal: expect.any(AbortSignal),
    });
    expect(result.current.data).toEqual(mockTemplate);
  });

  it('passes version to the API when provided', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useGetTemplate('template-1', 2), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiMock.getTemplate).toHaveBeenCalledWith({
      templateId: 'template-1',
      version: 2,
      signal: expect.any(AbortSignal),
    });
  });

  it('does not fetch when templateId is undefined', async () => {
    const queryClient = createTestQueryClient();

    renderHook(() => useGetTemplate(undefined), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    expect(apiMock.getTemplate).not.toHaveBeenCalled();
  });

  describe('query keys', () => {
    it('generates correct query key without version', () => {
      expect(casesQueriesKeys.template('template-1')).toEqual([
        'templates',
        'detail',
        'template-1',
        'latest',
      ]);
    });

    it('generates correct query key with version', () => {
      expect(casesQueriesKeys.template('template-1', 2)).toEqual([
        'templates',
        'detail',
        'template-1',
        2,
      ]);
    });
  });
});
