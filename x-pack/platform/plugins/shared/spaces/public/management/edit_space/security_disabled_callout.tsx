/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCallOut } from '@elastic/eui';
import React from 'react';

import { i18n } from '@kbn/i18n';

export const SecurityDisabledCallout = () => (
  <EuiCallOut
    color="warning"
    data-test-subj="securityDisabledCallout"
    title={i18n.translate(
      'xpack.spaces.management.spaceDetails.contentTabs.securityDisabledTitle',
      {
        defaultMessage: 'Security feature is disabled',
      }
    )}
  >
    {i18n.translate(
      'xpack.spaces.management.spaceDetails.contentTabs.securityDisabledDescription',
      {
        defaultMessage: 'To manage permissions, enable security feature.',
      }
    )}
  </EuiCallOut>
);
