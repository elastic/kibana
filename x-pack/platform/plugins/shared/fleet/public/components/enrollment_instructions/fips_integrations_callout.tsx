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

export const FipsIntegrationsCallout: React.FC<{
  nonFipsIntegrations: Array<{ name: string; title: string }>;
}> = ({ nonFipsIntegrations = [] }) => {
  return nonFipsIntegrations.length > 0 ? (
    <>
      <EuiCallOut
        size="m"
        color="warning"
        iconType="warning"
        title={i18n.translate('xpack.fleet.agentEnrollmentCallout.rootPrivilegesTitle', {
          defaultMessage: 'FIPS mode compatibility',
        })}
      >
        <FormattedMessage
          id="xpack.fleet.createPackagePolicy.secretsDisabledCalloutDescription"
          defaultMessage="This agent policy contains the following integrations that are not FIPS compatible. Enrolling an agent in FIPS mode might cause the agent to not ingest data properly.For more information, see the {guideLink}"
        />
        <ul>
          {nonFipsIntegrations.map((item) => (
            <li key={item.name}>{item.title}</li>
          ))}
        </ul>
      </EuiCallOut>

      <EuiSpacer size="m" />
    </>
  ) : null;
};
