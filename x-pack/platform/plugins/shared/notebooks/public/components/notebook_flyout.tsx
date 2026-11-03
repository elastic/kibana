/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiFlyoutResizable, type EuiFlyoutResizableProps } from '@elastic/eui';

const FLYOUT_WIDTH_STORAGE_KEY = 'notebooks:flyoutWidth';

/** A resizable flyout whose width is shared by every notebook flyout and kept across sessions. */
export const NotebookFlyout = (props: Omit<EuiFlyoutResizableProps, 'size' | 'onResize'>) => {
  const [width, setWidth] = useLocalStorage<number>(FLYOUT_WIDTH_STORAGE_KEY);
  return <EuiFlyoutResizable {...props} size={width ?? 's'} onResize={setWidth} />;
};
