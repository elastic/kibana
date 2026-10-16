/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface LoadErrorProps {
  error: Error;
  onRetry: () => void;
}

/** Says the boost settings couldn't load, with a way to try again. */
export const LoadError = ({ error, onRetry }: LoadErrorProps) => (
  <EuiEmptyPrompt
    color="danger"
    iconType="error"
    title={
      <h2>
        {i18n.translate('xpack.boost.page.loadErrorTitle', {
          defaultMessage: 'Unable to load boost settings',
        })}
      </h2>
    }
    body={<p>{error.message}</p>}
    actions={
      <EuiButton onClick={onRetry}>
        {i18n.translate('xpack.boost.page.retryButton', { defaultMessage: 'Try again' })}
      </EuiButton>
    }
  />
);
