/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCallOut, EuiLink } from '@elastic/eui';
import React from 'react';

import { i18n } from '@kbn/i18n';

type Props = {
  enableSecurityLink: string;
};

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
    <EuiLink href={enableSecurityLink}>
      {i18n.translate('xpack.spaces.management.spaceDetails.contentTabs.securityDisabledLinkText', {
        defaultMessage: 'To manage space permissions, you must enable security features first.',
      })}
    </EuiLink>
  </EuiCallOut>
);
