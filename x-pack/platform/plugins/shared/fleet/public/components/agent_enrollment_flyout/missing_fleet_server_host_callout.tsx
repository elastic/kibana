/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink, EuiButton, EuiSpacer } from '@elastic/eui';

import { useLink, useStartServices } from '../../hooks';

export const MissingFleetServerHostCallout: React.FunctionComponent = () => {
  const { docLinks } = useStartServices();
  const { getHref } = useLink();

  return (
    <EuiCallOut
      title={i18n.translate('xpack.fleet.agentEnrollment.missingFleetHostCalloutTitle', {
        defaultMessage: 'Missing URL for Fleet Server host',
      })}
    >
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.missingFleetHostCalloutText"
        defaultMessage="A URL for your Fleet Server host is required to enroll agents with Fleet. You can add this information in Fleet Settings. For more information, see the {link}."
        values={{
          link: (
            <EuiLink href={docLinks.links.fleet.guide} target="_blank" external>
              <FormattedMessage
                id="xpack.fleet.agentEnrollment.missingFleetHostGuideLink"
                defaultMessage="Fleet and Elastic Agent Guide"
              />
            </EuiLink>
          ),
        }}
      />
      <EuiSpacer size="m" />
      <EuiButton fill iconType="gear" href={getHref('settings')}>
        <FormattedMessage
          id="xpack.fleet.agentEnrollment.fleetSettingsLink"
          defaultMessage="Fleet Settings"
        />
      </EuiButton>
    </EuiCallOut>
  );
};
