/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLink } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import * as i18n from './translations';

const PlatinumLicenseCalloutComponent: React.FC = () => {
  return (
    <EuiCallOut
      title={i18n.UPGRADE_TO_PLATINUM}
      id="case-callout-license-info"
      iconType="gear"
      data-test-subj="case-callout-license-info"
    >
      <FormattedMessage
        defaultMessage="Assigning users to cases or opening cases in external systems is available when you have the {appropriateLicense}, are using a {cloud}, or are testing out a Free Trial."
        id="xpack.cases.platinumLicenseCalloutMessage"
        values={{
          appropriateLicense: (
            <EuiLink href="https://www.elastic.co/subscriptions" target="_blank">
              {i18n.LINK_APPROPRIATE_LICENSE}
            </EuiLink>
          ),
          cloud: (
            <EuiLink
              href="https://www.elastic.co/cloud/elasticsearch-service/signup"
              target="_blank"
            >
              {i18n.LINK_CLOUD_DEPLOYMENT}
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};

PlatinumLicenseCalloutComponent.displayName = 'PlatinumLicenseCalloutComponent';

export const PlatinumLicenseCallout = React.memo(PlatinumLicenseCalloutComponent);
