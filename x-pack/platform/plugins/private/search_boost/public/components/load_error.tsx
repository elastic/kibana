/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { LOAD_ERROR_TITLE, RETRY_LABEL } from '../translations';

export interface LoadErrorProps {
  error: { message: string };
  onRetry: () => void;
}

export const LoadError = ({ error, onRetry }: LoadErrorProps) => (
  <EuiEmptyPrompt
    iconType="error"
    color="danger"
    title={<h2>{LOAD_ERROR_TITLE}</h2>}
    body={error.message}
    actions={
      <EuiButton color="danger" onClick={onRetry} data-test-subj="searchBoostRetry">
        {RETRY_LABEL}
      </EuiButton>
    }
    data-test-subj="searchBoostLoadError"
  />
);
