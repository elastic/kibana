/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useStartServices } from '../../hooks';

export const NonFipsIntegrationsCallout: React.FC<{
  nonFipsIntegrations?: Array<{ name: string; title: string }>;
}> = ({ nonFipsIntegrations = [] }) => {
  const { docLinks } = useStartServices();

  return nonFipsIntegrations.length > 0 ? (
    <>
      <EuiCallOut
        size="m"
        color="warning"
        iconType="warning"
        title={i18n.translate(
          'xpack.fleet.agentEnrollmentCallout.nonFipsIntegrationsCalloutTitle',
          {
            defaultMessage: 'FIPS mode compatibility',
          }
        )}
        data-test-subj="nonFipsIntegrationsCallout"
      >
        <FormattedMessage
          id="xpack.fleet.agentEnrollmentCallout.nonFipsIntegrationsCalloutDescription"
          defaultMessage="This agent policy contains the following integrations that are not FIPS compatible. Enrolling an agent in FIPS mode might cause the agent to not ingest data properly. For more information, see the {guideLink}."
          values={{
            guideLink: (
              <EuiLink href={docLinks.links.fleet.fipsIngest} target="_blank" external>
                <FormattedMessage
                  id="xpack.fleet.agentEnrollmentCallout.nonFipsIntegrationsMessage.guideLink"
                  defaultMessage="Guide"
                />
              </EuiLink>
            ),
          }}
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
