/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ICONS } from '../../icons';
import { getHttpErrorMessage } from '../../hooks/errors';
import * as i18n from './translations';

export interface ErrorStateProps {
  title?: React.ReactNode;
  error?: unknown;
  onRetry?: () => void;
  actions?: React.ReactNode;
  /** Shown next to Try again, for example a way back to the list. */
  extraActions?: React.ReactNode;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  error,
  onRetry,
  actions,
  extraActions,
}) => (
  <EuiEmptyPrompt
    iconType={ICONS.error}
    color="danger"
    title={<h2>{title ?? i18n.ERROR_TITLE}</h2>}
    body={error ? <p>{getHttpErrorMessage(error)}</p> : undefined}
    actions={
      actions ??
      (onRetry || extraActions ? (
        <EuiFlexGroup gutterSize="s" justifyContent="center" responsive={false} wrap>
          {onRetry ? (
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={onRetry}
                iconType={ICONS.refresh}
                data-test-subj="investigationErrorRetry"
              >
                {i18n.RETRY}
              </EuiButton>
            </EuiFlexItem>
          ) : null}
          {extraActions ? <EuiFlexItem grow={false}>{extraActions}</EuiFlexItem> : null}
        </EuiFlexGroup>
      ) : undefined)
    }
    titleSize="s"
    data-test-subj="investigationErrorState"
  />
);
ErrorState.displayName = 'ErrorState';
