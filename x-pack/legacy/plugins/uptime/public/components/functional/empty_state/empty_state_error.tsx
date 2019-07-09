/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { GraphQLError } from 'graphql';

interface EmptyStateErrorProps {
  errors: GraphQLError[];
}

export const EmptyStateError = ({ errors }: EmptyStateErrorProps) => (
  <EuiPanel>
    <EuiEmptyPrompt
      title={
        <EuiTitle size="l">
          <h3>
            {i18n.translate('xpack.uptime.emptyStateError.title', {
              defaultMessage: 'Error',
            })}
          </h3>
        </EuiTitle>
      }
      body={
        <Fragment>
          {errors.map((error: GraphQLError) => (
            <p key={error.message}>{error.message}</p>
          ))}
        </Fragment>
      }
    />
  </EuiPanel>
);
