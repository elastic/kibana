/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiCallOut,
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { NavigationMenu } from '../components/navigation_menu';

export const Page = () => (
  <Fragment>
    <NavigationMenu tabId="access-denied" />
    <EuiPage>
      <EuiPageBody>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h1>
                <FormattedMessage
                  id="xpack.ml.management.jobsList.accessDeniedTitle"
                  defaultMessage="Access denied"
                />
              </h1>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={i18n.translate('xpack.ml.accessDenied.label', {
              defaultMessage: 'Insufficient permissions',
            })}
            color="danger"
            iconType="cross"
          >
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.ml.accessDenied.description"
                  defaultMessage="You don’t have permission to access the ML plugin"
                />
              </p>
            </EuiText>
          </EuiCallOut>
        </EuiPageContentBody>
      </EuiPageBody>
    </EuiPage>
  </Fragment>
);
