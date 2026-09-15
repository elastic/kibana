/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

/** Shared "failed to load signals" prompt, rendered identically by the panel and the group flyout. */
export const SignalsErrorPrompt = () => (
  <EuiEmptyPrompt
    color="danger"
    iconType="error"
    titleSize="xs"
    data-test-subj="contextSignalsError"
    title={
      <h3>
        {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.errorTitle', {
          defaultMessage: 'Unable to load signals',
        })}
      </h3>
    }
    body={
      <p>
        {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.errorBody', {
          defaultMessage: 'Something went wrong while loading signals. Try again later.',
        })}
      </p>
    }
  />
);
