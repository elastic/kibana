/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiEmptyPrompt,
  EuiPanel,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import React from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';

export const NotFoundPage = () => (
  <EuiFlexGroup justifyContent="center">
    <EuiFlexItem grow={false}>
      <EuiPanel>
        <EuiEmptyPrompt
          iconType="faceNeutral"
          iconColor="subdued"
          title={
            <EuiTitle size="m">
              <h3>
                <FormattedMessage
                  defaultMessage="Page not found"
                  id="xpack.uptime.emptyStateError.notFoundPage"
                />
              </h3>
            </EuiTitle>
          }
          body={
            <Link to="/">
              <EuiButton href="/">
                <FormattedMessage
                  defaultMessage="Back to home"
                  id="xpack.uptime.notFountPage.homeLinkText"
                />
              </EuiButton>
            </Link>
          }
        />
      </EuiPanel>
    </EuiFlexItem>
  </EuiFlexGroup>
);
