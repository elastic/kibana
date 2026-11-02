/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React, { forwardRef } from 'react';
import { useWorkpadPageStyles } from './use_workpad_page_styles';

// Forwards the ref to the underlying page element: the interactive page relies on
// it to capture the DOM node for `saveCanvasOrigin` (used by pointer math).
export const WorkpadPageRoot = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
  ({ css: cssProp, ...props }, ref) => {
    const pageStyles = useWorkpadPageStyles();

    return <div ref={ref} css={[pageStyles, cssProp]} {...props} />;
  }
);

WorkpadPageRoot.displayName = 'WorkpadPageRoot';
