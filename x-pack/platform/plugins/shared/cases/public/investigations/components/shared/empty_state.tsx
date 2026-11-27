/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { IconType } from '@elastic/eui';

export interface EmptyStateProps {
  title: React.ReactNode;
  body?: React.ReactNode;
  iconType?: IconType;
  actions?: React.ReactNode;
  'data-test-subj'?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  body,
  iconType,
  actions,
  'data-test-subj': dataTestSubj = 'investigationEmptyState',
}) => (
  <EuiEmptyPrompt
    iconType={iconType}
    title={<h2>{title}</h2>}
    body={body ? <p>{body}</p> : undefined}
    actions={actions}
    titleSize="s"
    data-test-subj={dataTestSubj}
  />
);
EmptyState.displayName = 'EmptyState';
