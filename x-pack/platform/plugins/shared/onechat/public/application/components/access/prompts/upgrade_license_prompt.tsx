/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { PromptLayout } from './prompt_layout';
import { useOnechatServices } from '../../../hooks/use_onechat_service';

const LICENSE_MANAGEMENT_LOCATOR = 'LICENSE_MANAGEMENT_LOCATOR';

const useLicenseManagementLocator = () => {
  const {
    startDependencies: { share },
  } = useOnechatServices();

  // Should we instead use the recommended approach that is mentioned in the README?
  // https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/share/README.mdx#using-locator-of-another-app
  const locator = share.url.locators.get(LICENSE_MANAGEMENT_LOCATOR);

  // license management does not exist on serverless
  if (!locator) {
    return null;
  }

  return () => {
    locator.navigate({
      page: 'dashboard',
    });
  };
};

const SUBSCRIPTIONS_LINK = 'https://www.elastic.co/subscriptions';

const UpgradeLicenseActions: React.FC<{}> = () => {
  const navigateToLicenseManagement = useLicenseManagementLocator();
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiButton fill href={SUBSCRIPTIONS_LINK} target="_blank">
          <FormattedMessage
            id="xpack.onechat.access.prompt.upgradeLicense.actions.subscriptionPlansButton"
            defaultMessage="Subscription plans"
          />
        </EuiButton>
      </EuiFlexItem>
      {navigateToLicenseManagement && (
        <EuiFlexItem>
          <EuiButtonEmpty onClick={navigateToLicenseManagement}>
            <FormattedMessage
              id="xpack.onechat.access.prompt.upgradeLicense.actions.manageLicenseButton"
              defaultMessage="Manage license"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const UpgradeLicensePrompt: React.FC<{}> = () => {
  return (
    <PromptLayout>
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
          <EuiFlexItem>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.onechat.access.prompt.upgradeLicense.title"
                  defaultMessage="Upgrade your cluster license"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.onechat.access.prompt.upgradeLicense.description"
                defaultMessage="Your cluster needs an Enterprise license to use the Elastic Agent Builder."
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <UpgradeLicenseActions />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </PromptLayout>
  );
};
