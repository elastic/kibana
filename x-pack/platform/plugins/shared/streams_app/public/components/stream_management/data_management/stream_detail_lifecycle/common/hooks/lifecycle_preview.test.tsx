/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import type { LifecyclePreviewApi } from './lifecycle_preview';
import { LifecyclePreviewProvider, useLifecyclePreview } from './lifecycle_preview';

let previewApi: LifecyclePreviewApi | undefined;

const getApi = (): LifecyclePreviewApi => {
  if (!previewApi) {
    throw new Error('preview api was not captured');
  }
  return previewApi;
};

const ApiCapture = () => {
  previewApi = useLifecyclePreview();
  return null;
};

const Harness = ({ refreshSignal }: { refreshSignal?: number }) => (
  <LifecyclePreviewProvider refreshSignal={refreshSignal}>
    <ApiCapture />
  </LifecyclePreviewProvider>
);

const activatePreview = () => {
  act(() => {
    getApi().setIsActive(true);
    getApi().setRetentionPeriod('7d');
  });
};

describe('LifecyclePreviewProvider deferred clear', () => {
  beforeEach(() => {
    previewApi = undefined;
  });

  it('clears the preview immediately when no save refresh is in flight (e.g. after a save error)', () => {
    render(<Harness refreshSignal={0} />);
    activatePreview();

    expect(getApi().isActive).toBe(true);
    expect(getApi().retentionPeriod).toBe('7d');

    // A save failed, so `refreshSignal` never changed and no clear is held back: closing the flyout
    // tears down the preview right away, reverting the summary to the original saved value.
    act(() => {
      getApi().clearPreview();
    });

    expect(getApi().isActive).toBe(false);
    expect(getApi().retentionPeriod).toBeNull();
  });

  it('holds the clear until the post-save refresh lands, then applies it', () => {
    const { rerender } = render(<Harness refreshSignal={0} />);
    activatePreview();

    // A successful save bumps `refreshSignal`, putting the provider into "hold" mode.
    rerender(<Harness refreshSignal={1} />);

    // The flyout closes and requests a clear, but it is deferred so the summary keeps showing the
    // previewed value instead of flashing the stale pre-save value during the refetch.
    act(() => {
      getApi().clearPreview();
    });
    expect(getApi().isActive).toBe(true);
    expect(getApi().retentionPeriod).toBe('7d');

    // Once the refreshed definition arrives, the held clear is released.
    act(() => {
      getApi().releaseHoldAfterRefresh();
    });
    expect(getApi().isActive).toBe(false);
    expect(getApi().retentionPeriod).toBeNull();
  });

  it('is a no-op to release when nothing was held back', () => {
    render(<Harness refreshSignal={0} />);
    activatePreview();

    act(() => {
      getApi().releaseHoldAfterRefresh();
    });

    expect(getApi().isActive).toBe(true);
    expect(getApi().retentionPeriod).toBe('7d');
  });
});
