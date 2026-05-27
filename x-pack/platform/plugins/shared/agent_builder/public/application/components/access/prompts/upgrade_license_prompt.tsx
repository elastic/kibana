/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import type { PromptLayoutVariant } from '../../common/prompt/layout';
import { ErrorPrompt } from '../../common/prompt/error_prompt';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useAssetBasePath } from '../../../hooks/use_asset_base_path';

const SUBSCRIPTIONS_LINK = 'https://www.elastic.co/subscriptions';

export interface UpgradeLicensePromptProps {
  variant?: PromptLayoutVariant;
}

export const UpgradeLicensePrompt: React.FC<UpgradeLicensePromptProps> = ({ variant }) => {
  const assetBasePath = useAssetBasePath();
  const { colorMode } = useEuiTheme();
  const { navigationService } = useAgentBuilderServices();

  const primaryButton = (
    <EuiButton
      fill
      href={SUBSCRIPTIONS_LINK}
      target="_blank"
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.access.SUBSCRIPTION_PLANS,
        detail: 'license',
      })}
    >
      <FormattedMessage
        id="xpack.agentBuilder.access.prompt.upgradeLicense.actions.subscriptionPlansButton"
        defaultMessage="Subscription plans"
      />
    </EuiButton>
  );

  const secondaryButton = navigationService.hasLicenseManagentLocator() ? (
    <EuiButtonEmpty
      onClick={() => {
        navigationService.navigateToLicenseManagementDashboard();
      }}
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.access.MANAGE_LICENSE,
        detail: 'license',
      })}
    >
      <FormattedMessage
        id="xpack.agentBuilder.access.prompt.upgradeLicense.actions.manageLicenseButton"
        defaultMessage="Manage your license"
      />
    </EuiButtonEmpty>
  ) : undefined;

  return (
    <ErrorPrompt
      variant={variant}
      errorType="UPGRADE_LICENSE"
      imageSrc={
        colorMode === 'LIGHT' ? `${assetBasePath}/lock_light.svg` : `${assetBasePath}/lock_dark.svg`
      }
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
    />
  );
};
