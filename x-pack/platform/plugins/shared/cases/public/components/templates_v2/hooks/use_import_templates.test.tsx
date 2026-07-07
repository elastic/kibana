/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useImportTemplates } from './use_import_templates';
import { postTemplate, patchTemplate } from '../api/api';
import { casesQueriesKeys } from '../../../containers/constants';
import { useCasesToast } from '../../../common/use_cases_toast';
import { TestProviders, createTestQueryClient } from '../../../common/mock';
import type { ParsedTemplateEntry } from './use_parse_yaml';

jest.mock('../api/api');
jest.mock('../../../common/use_cases_toast');

const makeTemplate = (overrides: Partial<ParsedTemplateEntry> = {}): ParsedTemplateEntry => ({
  name: 'Test Template',
  sourceFileName: 'test.yaml',
  documentIndex: 0,
  existsOnServer: false,
  ...overrides,
});

describe('useImportTemplates', () => {
  const showErrorToast = jest.fn();
  const showSuccessToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useCasesToast as jest.Mock).mockReturnValue({ showErrorToast, showSuccessToast });
  });

  it('creates new templates via postTemplate', async () => {
    (postTemplate as jest.Mock).mockResolvedValue({ templateId: 'new-1' });

    const { result } = renderHook(() => useImportTemplates(), { wrapper: TestProviders });

    const output = await result.current.importTemplates([makeTemplate()]);

    expect(postTemplate).toHaveBeenCalledTimes(1);
    expect(patchTemplate).not.toHaveBeenCalled();
    expect(output.created).toBe(1);
    expect(output.updated).toBe(0);
    expect(output.failed).toBe(0);
  });

  it('updates existing templates via patchTemplate', async () => {
    (patchTemplate as jest.Mock).mockResolvedValue({ templateId: 'existing-1' });

    const template = makeTemplate({
      templateId: 'existing-1',
      existsOnServer: true,
    });

    const { result } = renderHook(() => useImportTemplates(), { wrapper: TestProviders });

    const output = await result.current.importTemplates([template]);

    expect(patchTemplate).toHaveBeenCalledTimes(1);
    expect(patchTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 'existing-1' })
    );
    expect(postTemplate).not.toHaveBeenCalled();
    expect(output.updated).toBe(1);
  });

  it('defaults owner to securitySolution for new templates without owner', async () => {
    (postTemplate as jest.Mock).mockResolvedValue({ templateId: 'new-1' });

    const { result } = renderHook(() => useImportTemplates(), { wrapper: TestProviders });
    await result.current.importTemplates([makeTemplate({ owner: undefined })]);

    expect(postTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.objectContaining({ owner: 'securitySolution' }),
      })
    );
  });

  it('shows success toast when all imports succeed', async () => {
    (postTemplate as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useImportTemplates(), { wrapper: TestProviders });
    await result.current.importTemplates([makeTemplate(), makeTemplate({ name: 'Second' })]);

    expect(showSuccessToast).toHaveBeenCalledTimes(1);
    expect(showErrorToast).not.toHaveBeenCalled();
  });

  it('shows success toast for partial failures', async () => {
    (postTemplate as jest.Mock).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useImportTemplates(), { wrapper: TestProviders });
    const output = await result.current.importTemplates([
      makeTemplate({ name: 'Good' }),
      makeTemplate({ name: 'Bad' }),
    ]);

    expect(output.created).toBe(1);
    expect(output.failed).toBe(1);
    expect(showSuccessToast).toHaveBeenCalledTimes(1);
  });

  it('shows error toast when all imports fail', async () => {
    (postTemplate as jest.Mock).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useImportTemplates(), { wrapper: TestProviders });
    const output = await result.current.importTemplates([makeTemplate()]);

    expect(output.failed).toBe(1);
    expect(output.created).toBe(0);
    expect(showErrorToast).toHaveBeenCalledTimes(1);
  });

  it('captures error details from rejected promises', async () => {
    const apiError = { body: { message: 'Conflict' } };
    (postTemplate as jest.Mock).mockRejectedValue(apiError);

    const { result } = renderHook(() => useImportTemplates(), { wrapper: TestProviders });
    const output = await result.current.importTemplates([makeTemplate({ name: 'Conflicting' })]);

    expect(output.errors).toHaveLength(1);
    expect(output.errors[0]).toEqual({
      templateName: 'Conflicting',
      error: 'Conflict',
    });
  });

  it('invalidates templates query after import', async () => {
    (postTemplate as jest.Mock).mockResolvedValue({});
    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useImportTemplates(), {
      wrapper: (props) => <TestProviders {...props} queryClient={queryClient} />,
    });

    await result.current.importTemplates([makeTemplate()]);

    expect(invalidateSpy).toHaveBeenCalledWith(casesQueriesKeys.templates);
  });

  it('resets isImporting to false even when an error is thrown', async () => {
    (postTemplate as jest.Mock).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useImportTemplates(), { wrapper: TestProviders });

    await result.current.importTemplates([makeTemplate()]);

    await waitFor(() => {
      expect(result.current.isImporting).toBe(false);
    });
  });

  it('handles mixed create and update operations', async () => {
    (postTemplate as jest.Mock).mockResolvedValue({});
    (patchTemplate as jest.Mock).mockResolvedValue({});

    const templates = [
      makeTemplate({ name: 'New' }),
      makeTemplate({ name: 'Existing', templateId: 'id-1', existsOnServer: true }),
    ];

    const { result } = renderHook(() => useImportTemplates(), { wrapper: TestProviders });
    const output = await result.current.importTemplates(templates);

    expect(postTemplate).toHaveBeenCalledTimes(1);
    expect(patchTemplate).toHaveBeenCalledTimes(1);
    expect(output.created).toBe(1);
    expect(output.updated).toBe(1);
  });
});
