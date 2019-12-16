/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment-timezone';
import { capitalize } from 'lodash';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

const formatDateLocal = input => moment.tz(input, moment.tz.guess()).format('LL');

export function LicenseText({ license, showLicenseExpiration }) {
  if (!showLicenseExpiration) {
    return null;
  }

  return (
    <EuiLink href="#/license">
      <FormattedMessage
        id="xpack.monitoring.cluster.overview.licenseText.toLicensePageLinkLabel"
        defaultMessage="{licenseType} license {willExpireOn}"
        values={{
          licenseType: capitalize(license.type),
          willExpireOn:
            license.expiry_date_in_millis === undefined ? (
              ''
            ) : (
              <FormattedMessage
                id="xpack.monitoring.cluster.overview.licenseText.expireDateText"
                defaultMessage="will expire on {expiryDate}"
                values={{ expiryDate: formatDateLocal(license.expiry_date_in_millis) }}
              />
            ),
        }}
      />
    </EuiLink>
  );
}
