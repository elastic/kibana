/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const FipsIntegrationsCallout: React.FC<{ policyHasFipsAgents: boolean }> = ({
  policyHasFipsAgents = [],
}) => {
  return policyHasFipsAgents ? (
    <>
      <EuiCallOut
        size="m"
        color="warning"
        title={i18n.translate('xpack.fleet.agentEnrollmentCallout.rootPrivilegesTitle', {
          defaultMessage: 'FIPS mode required',
        })}
      >
        <FormattedMessage
          id="xpack.fleet.createPackagePolicy.secretsDisabledCalloutDescription"
          defaultMessage="Fleet has detected that the selected agent policy has one or more integrations that are FIPS enabled. Enroll the agent in FIPS mode for best compatibility."
        />
      </EuiCallOut>

      <EuiSpacer size="m" />
    </>
  ) : null;
};
