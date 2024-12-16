/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiText,
} from '@elastic/eui';

interface Props {
  basePath: CoreStart['http']['basePath'];
}

export const InsufficientLicensePage: FC<Props> = ({ basePath }) => (
  <>
    <EuiPageTemplate.EmptyPrompt
      title={
        <h2>
          <FormattedMessage
            id="xpack.ml.management.jobsList.insufficientLicenseLabel"
            defaultMessage="Machine learning is a subscription feature"
          />
        </h2>
      }
      data-test-subj="mlPageInsufficientLicense"
      body={
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiText color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.ml.management.jobsList.insufficientLicenseDescription"
                  defaultMessage="Select an option to unlock it."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="license-prompt-upgrade"
                  key="upgrade-subscription-button"
                  target="_blank"
                  href="https://www.elastic.co/subscriptions"
                >
                  <FormattedMessage
                    id="xpack.ml.management.jobsList.insufficientLicenseDescription.SubscriptionLink"
                    defaultMessage="Upgrade your subscription"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  data-test-subj="license-prompt-trial"
                  key="start-trial-button"
                  target="_blank"
                  href={`${basePath.get()}/app/management/stack/license_management/home`}
                >
                  <FormattedMessage
                    id="xpack.ml.management.jobsList.insufficientLicenseDescription.startTrialLink"
                    defaultMessage="Start trial"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  </>
);
