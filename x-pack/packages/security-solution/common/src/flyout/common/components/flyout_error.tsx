/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FLYOUT_ERROR_TEST_ID } from '../test_ids';

/**
 * Use this when you need to show an error state in the flyout
 */
export const FlyoutError: React.VFC = () => (
  <EuiFlexItem>
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      title={
        <h2>
          <FormattedMessage
            id="securitySolutionPackages.flyout.shared.errorTitle"
            defaultMessage="Unable to display {title}."
            values={{ title: 'data' }}
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="securitySolutionPackages.flyout.shared.errorDescription"
            defaultMessage="There was an error displaying {message}."
            values={{ message: 'data' }}
          />
        </p>
      }
      data-test-subj={FLYOUT_ERROR_TEST_ID}
    />
  </EuiFlexItem>
);

FlyoutError.displayName = 'FlyoutError';
