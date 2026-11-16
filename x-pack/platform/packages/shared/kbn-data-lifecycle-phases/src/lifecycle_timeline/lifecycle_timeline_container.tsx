/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { getContainerStyles } from './styles';

export interface LifecycleTimelineContainerProps {
  children: ReactNode;
  'data-test-subj'?: string;
}

/** Scrolls its rows sideways when they don't fit, and is the container their `narrow` grid responds to. */
export const LifecycleTimelineContainer = ({
  children,
  'data-test-subj': dataTestSubj,
}: LifecycleTimelineContainerProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div css={getContainerStyles(euiTheme)} data-test-subj={dataTestSubj}>
      {children}
    </div>
  );
};
