/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiCallOut,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { VIEW_LICENSE_OPTIONS_LINK } from '../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';

const UpgradeLicenseCallOutComponent: React.FC = () => {
  const { http } = useKibana().services;

  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.triggersActionsUI.sections.actionConnectorAdd.upgradeYourPlanBannerTitle',
        { defaultMessage: 'Upgrade your license to access all connectors' }
      )}
      data-test-subj="upgrade-your-license-callout"
    >
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.actionConnectorAdd.upgradeYourPlanBannerMessage"
        defaultMessage="Upgrade your license or start a 30-day free trial for immediate access to all third-party connectors."
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiButton
            href={`${http.basePath.get()}/app/management/stack/license_management`}
            iconType="gear"
            target="_blank"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.actionConnectorAdd.manageLicensePlanBannerLinkTitle"
              defaultMessage="Manage license"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            href={VIEW_LICENSE_OPTIONS_LINK}
            iconType="popout"
            iconSide="right"
            target="_blank"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.actionConnectorAdd.upgradeYourPlanBannerLinkTitle"
              defaultMessage="Subscription plans"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};

export const UpgradeLicenseCallOut = memo(UpgradeLicenseCallOutComponent);
