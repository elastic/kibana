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

export const RootPrivilegesCallout: React.FC<{
  rootIntegrations?: Array<{ name: string; title: string }>;
}> = ({ rootIntegrations = [] }) => {
  const { docLinks } = useStartServices();
  return rootIntegrations.length > 0 ? (
    <>
      <EuiCallOut
        color="warning"
        iconType="warning"
        title={i18n.translate('xpack.fleet.agentEnrollmentCallout.rootPrivilegesTitle', {
          defaultMessage: 'Root privileges required',
        })}
        data-test-subj="rootPrivilegesCallout"
      >
        <FormattedMessage
          id="xpack.fleet.agentEnrollmentCallout.rootPrivilegesMessage"
          defaultMessage="This agent policy contains the following integrations that require Elastic Agents to have root privileges.
            To ensure that all data required by the integrations can be collected, enroll the agents using an account with root privileges. For more information, see the {guideLink}"
          values={{
            guideLink: (
              <EuiLink href={docLinks.links.fleet.unprivilegedMode} target="_blank" external>
                <FormattedMessage
                  id="xpack.fleet.agentEnrollmentCallout.rootPrivilegesMessage.guideLink"
                  defaultMessage="Fleet and Elastic Agent Guide"
                />
              </EuiLink>
            ),
          }}
        />
        <ul>
          {rootIntegrations.map((item) => (
            <li key={item.name}>{item.title}</li>
          ))}
        </ul>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  ) : null;
};
