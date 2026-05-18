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

/**
 * Shared two-button footer for the L2 popover and L3 row-expand:
 *   [📊 Open <integration> dashboard →]   [📚 Learn more →]
 *
 * Dashboard link resolution is per `policy_template` (see `dashboard_links.ts`).
 * The dashboard button only enables when at least one permission has verified — otherwise
 * the integration has no data to show in its dashboard, and we surface that explicitly
 * via a tooltip rather than letting the user open an empty view.
 */

const LEARN_MORE_HREF =
  'https://www.elastic.co/guide/en/fleet/current/cloud-connectors-permission-verification.html';

interface IntegrationActionButtonsProps {
  policyTemplate: string;
  packagePolicyId: string;
  /**
   * True when the integration has at least one permission with `status: 'verified'`.
   * When false, the dashboard button renders disabled with an explanatory tooltip —
   * the dashboard would be empty without verified permissions.
   */
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
    // Prepend the Kibana basePath so links resolve correctly on deployments that
    // mount Kibana at a non-default path (e.g. server.basePath="/kbn"). `window.open`
    // bypasses SPA routing and the browser doesn't know about basePath, so we have
    // to prepend explicitly. `navigateToUrl` handles basePath internally.
    const href = dashboardLink.newTab
      ? http?.basePath.prepend(dashboardLink.href) ?? dashboardLink.href
      : dashboardLink.href;
    if (dashboardLink.newTab) {
      window.open(href, '_blank', 'noopener');
    } else {
      // navigateToUrl preserves SPA navigation when staying within Kibana.
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
