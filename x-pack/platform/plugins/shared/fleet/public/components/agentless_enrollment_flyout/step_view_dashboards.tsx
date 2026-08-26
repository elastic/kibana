/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

export const AgentlessStepViewDashboards = ({ dashboardsLink }: { dashboardsLink: string }) => {
  return (
    <>
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.fleet.agentlessEnrollmentFlyout.stepViewDashboards.description"
            defaultMessage="Your integration is live and ingesting data. Explore the pre-built dashboards to get started."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiButton
        data-test-subj="agentlessStepViewDashboardsLink"
        href={dashboardsLink}
        iconType="dashboardApp"
        aria-label={i18n.translate(
          'xpack.fleet.agentlessEnrollmentFlyout.stepViewDashboards.linkAriaLabel',
          { defaultMessage: 'View dashboards for this integration' }
        )}
      >
        <FormattedMessage
          id="xpack.fleet.agentlessEnrollmentFlyout.stepViewDashboards.linkLabel"
          defaultMessage="View dashboards"
        />
      </EuiButton>
    </>
  );
};
