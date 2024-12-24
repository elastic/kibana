/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useStartServices } from '../../hooks';

export const UnprivilegedInfo: React.FC = () => {
  const { docLinks } = useStartServices();
  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.fleet.agentEnrollmentFlyout.unprivilegedMessage"
            defaultMessage="To install Elastic Agent without root privileges, add the {flag} flag to the {command} command below. For more information, see the {guideLink}"
            values={{
              flag: <EuiCode>--unprivileged</EuiCode>,
              command: <EuiCode>elastic-agent install</EuiCode>,
              guideLink: (
                <EuiLink href={docLinks.links.fleet.unprivilegedMode} target="_blank" external>
                  <FormattedMessage
                    id="xpack.fleet.agentEnrollmentFlyout.unprivilegedMessage.guideLink"
                    defaultMessage="Fleet and Elastic Agent Guide"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
    </>
  );
};
