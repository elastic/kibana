/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCallOut, EuiLink } from '@elastic/eui';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  enableSecurityLink: string;
}

export const SecurityDisabledCallout = ({ enableSecurityLink }: Props) => (
  <EuiCallOut
    color="warning"
    data-test-subj="securityDisabledCallout"
    title={i18n.translate(
      'xpack.spaces.management.spaceDetails.contentTabs.securityDisabledTitle',
      {
        defaultMessage: 'Security features are disabled',
      }
    )}
  >
    <FormattedMessage
      id="xpack.spaces.management.spaceDetails.contentTabs.securityDisabledDescription"
      defaultMessage="To manage space permissions, you must enable security features first. {learnMoreLink}"
      values={{
        learnMoreLink: (
          <EuiLink href={enableSecurityLink} target="_blank" external={true}>
            <FormattedMessage
              id="xpack.spaces.management.spaceDetails.contentTabs.securityDisabledLearnMore"
              defaultMessage="Learn more"
            />
          </EuiLink>
        ),
      }}
    />
  </EuiCallOut>
);
