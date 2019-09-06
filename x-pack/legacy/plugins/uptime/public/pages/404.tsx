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
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <EuiFlexGroup justifyContent="center">
    <EuiFlexItem grow={false}>
      <EuiPanel>
        <EuiEmptyPrompt
          iconType="faceNeutral"
          iconColor="subdued"
          title={
            <EuiTitle size="m">
              {
                <h3>
                  {i18n.translate('xpack.uptime.emptyStateError.404', {
                    defaultMessage: 'Page Not found',
                  })}
                </h3>
              }
            </EuiTitle>
          }
          body={
            <Link to="/">
              <EuiButton href="/">Back to home</EuiButton>
            </Link>
          }
        />
      </EuiPanel>
    </EuiFlexItem>
  </EuiFlexGroup>
);
