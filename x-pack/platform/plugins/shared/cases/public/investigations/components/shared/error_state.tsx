/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { ICONS } from '../../icons';
import { getHttpErrorMessage } from '../../hooks/errors';
import * as i18n from './translations';

export interface ErrorStateProps {
  title?: React.ReactNode;
  error?: unknown;
  onRetry?: () => void;
  actions?: React.ReactNode;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ title, error, onRetry, actions }) => (
  <EuiEmptyPrompt
    iconType={ICONS.error}
    color="danger"
    title={<h2>{title ?? i18n.ERROR_TITLE}</h2>}
    body={error ? <p>{getHttpErrorMessage(error)}</p> : undefined}
    actions={
      actions ??
      (onRetry ? (
        <EuiButton
          onClick={onRetry}
          iconType={ICONS.refresh}
          data-test-subj="investigationErrorRetry"
        >
          {i18n.RETRY}
        </EuiButton>
      ) : undefined)
    }
    titleSize="s"
    data-test-subj="investigationErrorState"
  />
);
ErrorState.displayName = 'ErrorState';
