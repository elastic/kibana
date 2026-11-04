/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiFlyoutResizable, type EuiFlyoutResizableProps } from '@elastic/eui';
import { useNotebook } from './notebook_context';

const FLYOUT_WIDTH_STORAGE_KEY = 'notebooks:flyoutWidth';

type NotebookFlyoutProps = Omit<EuiFlyoutResizableProps, 'size' | 'onResize'> & {
  /** Whether cell run buttons hide while the flyout is open; push flyouts leave room for them. */
  hidesRunButtons?: boolean;
};

/** A resizable flyout whose width is shared by every notebook flyout and kept across sessions. */
export const NotebookFlyout = ({ hidesRunButtons = true, ...props }: NotebookFlyoutProps) => {
  const { openFlyouts$ } = useNotebook();
  const [storedWidth, setStoredWidth] = useLocalStorage<number>(FLYOUT_WIDTH_STORAGE_KEY);
  // A changing `size` resets the flyout's width, so the stored width only seeds the initial size.
  const [initialWidth] = useState(storedWidth);

  useEffect(() => {
    if (!hidesRunButtons) return;
    openFlyouts$.next(openFlyouts$.getValue() + 1);
    return () => openFlyouts$.next(openFlyouts$.getValue() - 1);
  }, [openFlyouts$, hidesRunButtons]);

  return <EuiFlyoutResizable {...props} size={initialWidth ?? 's'} onResize={setStoredWidth} />;
};
