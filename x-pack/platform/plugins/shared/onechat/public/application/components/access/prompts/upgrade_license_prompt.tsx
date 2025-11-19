/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { PromptLayout } from './prompt_layout';
import { useOnechatServices } from '../../../hooks/use_onechat_service';

const SUBSCRIPTIONS_LINK = 'https://www.elastic.co/subscriptions';

export const UpgradeLicensePrompt: React.FC<{}> = () => {
  const { navigationService } = useOnechatServices();

  const primaryButton = (
    <EuiButton fill href={SUBSCRIPTIONS_LINK} target="_blank">
      <FormattedMessage
        id="xpack.onechat.access.prompt.upgradeLicense.actions.subscriptionPlansButton"
        defaultMessage="Subscription plans"
      />
    </EuiButton>
  );

  const secondaryButton = navigationService.hasLicenseManagentLocator() ? (
    <EuiButtonEmpty
      onClick={() => {
        navigationService.navigateToLicenseManagementDashboard();
      }}
    >
      <FormattedMessage
        id="xpack.onechat.access.prompt.upgradeLicense.actions.manageLicenseButton"
        defaultMessage="Manage your license"
      />
    </EuiButtonEmpty>
  ) : undefined;

  return (
    <PromptLayout
      title={
        <FormattedMessage
          id="xpack.onechat.access.prompt.upgradeLicense.title"
          defaultMessage="Upgrade your cluster license"
        />
      }
      subtitle={
        <FormattedMessage
          id="xpack.onechat.access.prompt.upgradeLicense.description"
          defaultMessage="Your cluster needs an Enterprise license to use the Elastic Agent Builder."
        />
      }
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
    />
  );
};
