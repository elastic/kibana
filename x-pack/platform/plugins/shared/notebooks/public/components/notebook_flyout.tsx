/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiFlyoutResizable, type EuiFlyoutResizableProps } from '@elastic/eui';
import { useNotebook } from './notebook_context';

const FLYOUT_WIDTH_STORAGE_KEY = 'notebooks:flyoutWidth';

/** A resizable flyout whose width is shared by every notebook flyout and kept across sessions. */
export const NotebookFlyout = (props: Omit<EuiFlyoutResizableProps, 'size' | 'onResize'>) => {
  const { openFlyouts$ } = useNotebook();
  const [width, setWidth] = useLocalStorage<number>(FLYOUT_WIDTH_STORAGE_KEY);

  useEffect(() => {
    openFlyouts$.next(openFlyouts$.getValue() + 1);
    return () => openFlyouts$.next(openFlyouts$.getValue() - 1);
  }, [openFlyouts$]);

  return <EuiFlyoutResizable {...props} size={width ?? 's'} onResize={setWidth} />;
};
