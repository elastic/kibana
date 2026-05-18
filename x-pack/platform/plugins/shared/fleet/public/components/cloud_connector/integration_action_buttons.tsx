/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiLink, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';

import { PERMISSION_STATUS_TEST_SUBJECTS } from '../../../common/services/cloud_connectors/test_subjects';

import { getDashboardLink } from './dashboard_links';

const LEARN_MORE_HREF =
  'https://www.elastic.co/guide/en/fleet/current/cloud-connectors-permission-verification.html';

interface IntegrationActionButtonsProps {
  policyTemplate: string;
  packagePolicyId: string;
  hasVerifiedPermission: boolean;
}

export const IntegrationActionButtons: React.FC<IntegrationActionButtonsProps> = ({
  policyTemplate,
  packagePolicyId,
  hasVerifiedPermission,
}) => {
  const { application, http } = useKibana<CoreStart>().services;
  const dashboardLink = getDashboardLink(policyTemplate, { packagePolicyId });

  const handleOpenDashboard = (event: React.MouseEvent) => {
    event.preventDefault();
    const href = dashboardLink.newTab
      ? http?.basePath.prepend(dashboardLink.href) ?? dashboardLink.href
      : dashboardLink.href;
    if (dashboardLink.newTab) {
      window.open(href, '_blank', 'noopener');
    } else {
      application?.navigateToUrl(href);
    }
  };

  const disabledTooltip = i18n.translate(
    'xpack.fleet.cloudConnector.permissionStatus.dashboardButton.disabledTooltip',
    {
      defaultMessage:
        "This integration's dashboard isn't available yet. It opens once at least one permission has been verified.",
    }
  );

  const dashboardButton = (
    <EuiButton
      size="s"
      iconType="popout"
      iconSide="right"
      isDisabled={!hasVerifiedPermission}
      onClick={hasVerifiedPermission ? handleOpenDashboard : undefined}
      data-test-subj={PERMISSION_STATUS_TEST_SUBJECTS.OPEN_DASHBOARD_BUTTON}
    >
      {dashboardLink.label}
    </EuiButton>
  );

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        {hasVerifiedPermission ? (
          dashboardButton
        ) : (
          <EuiToolTip content={disabledTooltip}>{dashboardButton}</EuiToolTip>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink
          href={LEARN_MORE_HREF}
          target="_blank"
          external
          data-test-subj={PERMISSION_STATUS_TEST_SUBJECTS.LEARN_MORE_LINK}
        >
          {i18n.translate('xpack.fleet.cloudConnector.permissionStatus.learnMore', {
            defaultMessage: 'Learn more',
          })}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
