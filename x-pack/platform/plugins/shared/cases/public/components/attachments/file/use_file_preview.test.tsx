/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { useFilePreview } from './use_file_preview';

describe('useFilePreview', () => {
  it('isPreviewVisible is false by default', () => {
    const { result } = renderHook(() => {
      return useFilePreview();
    });

    expect(result.current.isPreviewVisible).toBeFalsy();
  });

  it('showPreview sets isPreviewVisible to true', () => {
    const { result } = renderHook(() => {
      return useFilePreview();
    });

    expect(result.current.isPreviewVisible).toBeFalsy();

    act(() => {
      result.current.showPreview();
    });

    expect(result.current.isPreviewVisible).toBeTruthy();
  });

  it('closePreview sets isPreviewVisible to false', () => {
    const { result } = renderHook(() => {
      return useFilePreview();
    });

    expect(result.current.isPreviewVisible).toBeFalsy();

    act(() => {
      result.current.showPreview();
    });

    expect(result.current.isPreviewVisible).toBeTruthy();

    act(() => {
      result.current.closePreview();
    });

    expect(result.current.isPreviewVisible).toBeFalsy();
  });
});
