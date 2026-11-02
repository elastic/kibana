/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { TARGET_TYPE_INDEX } from '../../common/target_types';
import { usePreviewDocumentLoader } from './use_preview_document_loader';
import { usePreviewPanelState } from './use_preview_panel_state';

jest.mock('./use_preview_document_loader', () => ({
  usePreviewDocumentLoader: jest.fn(),
}));

const setupLoaderMock = ({
  isLoadingPreviewDocument = false,
  previewDocumentLoadError,
  previewDocumentSource = 'fallback' as const,
}: {
  isLoadingPreviewDocument?: boolean;
  previewDocumentLoadError?: string;
  previewDocumentSource?: 'target' | 'fallback';
} = {}) => {
  jest.mocked(usePreviewDocumentLoader).mockReturnValue({
    isLoadingPreviewDocument,
    previewDocumentLoadError,
    previewDocumentSource,
  });
};

describe('usePreviewPanelState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns default modes and derived flags', () => {
    setupLoaderMock();

    const { result } = renderHook(() =>
      usePreviewPanelState({
        fieldRules: [],
        regexRules: [],
        isSubmitting: false,
        targetType: TARGET_TYPE_INDEX,
        targetId: '',
      })
    );

    expect(result.current.previewViewMode).toBe('table');
    expect(result.current.previewValueMode).toBe('original');
    expect(result.current.isInvalidPreviewJson).toBe(false);
    expect(result.current.isEmptyPreviewRows).toBe(true);
    expect(result.current.isControlsDisabled).toBe(false);
  });

  it('builds rows from parsed preview json and field rules', () => {
    setupLoaderMock();

    const { result } = renderHook(() =>
      usePreviewPanelState({
        fieldRules: [{ field: 'user.email', allowed: true, anonymized: false }],
        regexRules: [],
        isSubmitting: false,
        targetType: TARGET_TYPE_INDEX,
        targetId: 'logs-1',
      })
    );

    act(() => {
      result.current.setPreviewInput(JSON.stringify({ user: { email: 'alice@example.com' } }));
    });

    expect(result.current.isInvalidPreviewJson).toBe(false);
    expect(result.current.previewRows).toEqual([
      expect.objectContaining({
        field: 'user.email',
        originalValue: 'alice@example.com',
      }),
    ]);
    expect(result.current.isEmptyPreviewRows).toBe(false);
  });

  it('marks json as invalid when preview input is malformed', () => {
    setupLoaderMock();

    const { result } = renderHook(() =>
      usePreviewPanelState({
        fieldRules: [{ field: 'message', allowed: true, anonymized: false }],
        regexRules: [],
        isSubmitting: false,
        targetType: TARGET_TYPE_INDEX,
        targetId: 'logs-1',
      })
    );

    act(() => {
      result.current.setPreviewInput('{');
    });

    expect(result.current.isInvalidPreviewJson).toBe(true);
    expect(result.current.previewRows).toEqual([]);
  });

  it('updates preview input when document loader callback resolves', () => {
    let onPreviewDocumentLoaded: ((document: Record<string, unknown>) => void) | undefined;
    jest.mocked(usePreviewDocumentLoader).mockImplementation((params) => {
      onPreviewDocumentLoaded = params.onPreviewDocumentLoaded;
      return {
        isLoadingPreviewDocument: false,
        previewDocumentLoadError: undefined,
        previewDocumentSource: 'target',
      };
    });

    const { result } = renderHook(() =>
      usePreviewPanelState({
        fieldRules: [],
        regexRules: [],
        isSubmitting: false,
        targetType: TARGET_TYPE_INDEX,
        targetId: 'logs-1',
      })
    );

    act(() => {
      onPreviewDocumentLoaded?.({ loaded: 'from-target' });
    });

    expect(result.current.previewInput).toContain('"loaded": "from-target"');
  });

  it('disables controls while loading or submitting', () => {
    setupLoaderMock({ isLoadingPreviewDocument: true });

    const { result: loadingResult } = renderHook(() =>
      usePreviewPanelState({
        fieldRules: [],
        regexRules: [],
        isSubmitting: false,
        targetType: TARGET_TYPE_INDEX,
        targetId: 'logs-1',
      })
    );
    expect(loadingResult.current.isControlsDisabled).toBe(true);

    setupLoaderMock({ isLoadingPreviewDocument: false });
    const { result: submittingResult } = renderHook(() =>
      usePreviewPanelState({
        fieldRules: [],
        regexRules: [],
        isSubmitting: true,
        targetType: TARGET_TYPE_INDEX,
        targetId: 'logs-1',
      })
    );
    expect(submittingResult.current.isControlsDisabled).toBe(true);
  });

  it('ignores unsafe prototype paths when transforming preview json', () => {
    setupLoaderMock();

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();

    const { result } = renderHook(() =>
      usePreviewPanelState({
        fieldRules: [{ field: '__proto__.polluted', allowed: true, anonymized: true }],
        regexRules: [],
        isSubmitting: false,
        targetType: TARGET_TYPE_INDEX,
        targetId: 'logs-1',
      })
    );

    act(() => {
      result.current.setPreviewInput('{}');
    });

    expect(result.current.transformedPreviewDocument).toEqual({});
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
