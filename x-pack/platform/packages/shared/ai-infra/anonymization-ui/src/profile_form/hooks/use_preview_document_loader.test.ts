/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useQuery } from '@kbn/react-query';
import { TARGET_TYPE_INDEX, TARGET_TYPE_INDEX_PATTERN } from '../../common/target_types';
import { usePreviewDocumentLoader } from './use_preview_document_loader';

jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn(),
}));

const createQueryResult = (overrides: Record<string, unknown> = {}) =>
  ({
    data: undefined,
    isLoading: false,
    isSuccess: false,
    isError: false,
    ...overrides,
  } as unknown);

describe('usePreviewDocumentLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to local sample when preview fetch is disabled', () => {
    jest.mocked(useQuery).mockReturnValue(createQueryResult() as never);

    const onPreviewDocumentLoaded = jest.fn();
    const { result } = renderHook(() =>
      usePreviewDocumentLoader({
        targetType: TARGET_TYPE_INDEX,
        targetId: '   ',
        fetchPreviewDocument: undefined,
        onPreviewDocumentLoaded,
      })
    );

    expect(result.current.previewDocumentSource).toBe('fallback');
    expect(result.current.isLoadingPreviewDocument).toBe(false);
    expect(result.current.previewDocumentLoadError).toBeUndefined();
    expect(onPreviewDocumentLoaded).not.toHaveBeenCalled();
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('uses target source and emits loaded document on success', () => {
    jest.mocked(useQuery).mockReturnValue(
      createQueryResult({
        isSuccess: true,
        data: { message: 'hello' },
      }) as never
    );

    const onPreviewDocumentLoaded = jest.fn();
    const { result } = renderHook(() =>
      usePreviewDocumentLoader({
        targetType: TARGET_TYPE_INDEX,
        targetId: ' logs-* ',
        fetchPreviewDocument: jest.fn(),
        onPreviewDocumentLoaded,
      })
    );

    expect(result.current.previewDocumentSource).toBe('target');
    expect(result.current.previewDocumentLoadError).toBeUndefined();
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['anonymizationProfilesPreviewDocument', TARGET_TYPE_INDEX, 'logs-*'],
        enabled: true,
      })
    );
    const queryOptions = jest.mocked(useQuery).mock.calls[0][0] as {
      onSuccess?: (document: Record<string, unknown> | null | undefined) => void;
    };
    queryOptions.onSuccess?.({ message: 'hello' });
    expect(onPreviewDocumentLoaded).toHaveBeenCalledWith({ message: 'hello' });
  });

  it('shows no-document fallback message when fetch returns empty payload', () => {
    jest.mocked(useQuery).mockReturnValue(
      createQueryResult({
        isSuccess: true,
        data: undefined,
      }) as never
    );

    const { result } = renderHook(() =>
      usePreviewDocumentLoader({
        targetType: TARGET_TYPE_INDEX,
        targetId: 'logs-*',
        fetchPreviewDocument: jest.fn(),
        onPreviewDocumentLoaded: jest.fn(),
      })
    );

    expect(result.current.previewDocumentSource).toBe('fallback');
    expect(result.current.previewDocumentLoadError).toBe(
      'No readable document sample was found for the selected target. Using the local sample document instead.'
    );
  });

  it('shows load failure message when query errors', () => {
    jest.mocked(useQuery).mockReturnValue(
      createQueryResult({
        isError: true,
      }) as never
    );

    const { result } = renderHook(() =>
      usePreviewDocumentLoader({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetId: 'logs-*',
        fetchPreviewDocument: jest.fn(),
        onPreviewDocumentLoaded: jest.fn(),
      })
    );

    expect(result.current.previewDocumentSource).toBe('fallback');
    expect(result.current.previewDocumentLoadError).toBe(
      'Unable to load a document sample for the selected target. Using the local sample document instead.'
    );
  });
});
