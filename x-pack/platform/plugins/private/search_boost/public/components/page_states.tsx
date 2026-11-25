/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { LOADING_LABEL, LOAD_ERROR_TITLE, TRY_AGAIN_LABEL } from '../translations';

export const LoadingState = () => (
  <EuiEmptyPrompt
    icon={<EuiLoadingSpinner size="xl" />}
    body={LOADING_LABEL}
    data-test-subj="searchBoostLoading"
  />
);

interface LoadErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const LoadErrorState = ({ message, onRetry }: LoadErrorStateProps) => (
  <EuiFlexGroup justifyContent="center" alignItems="center">
    <EuiEmptyPrompt
      color="danger"
      iconType="error"
      title={<h2>{LOAD_ERROR_TITLE}</h2>}
      body={message}
      actions={
        <EuiButton color="danger" fill onClick={onRetry} data-test-subj="searchBoostLoadRetry">
          {TRY_AGAIN_LABEL}
        </EuiButton>
      }
      data-test-subj="searchBoostLoadError"
    />
  </EuiFlexGroup>
);
