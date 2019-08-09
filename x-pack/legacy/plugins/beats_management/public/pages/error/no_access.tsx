/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import * as React from 'react';
import { NoDataLayout } from '../../components/layouts/no_data';

export const NoAccessPage = injectI18n(({ intl }) => (
  <NoDataLayout
    title={intl.formatMessage({
      id: 'xpack.beatsManagement.noAccess.accessDeniedTitle',
      defaultMessage: 'Access denied',
    })}
    actionSection={[]}
  >
    <p>
      <FormattedMessage
        id="xpack.beatsManagement.noAccess.accessDeniedDescription"
        defaultMessage="You are not authorized to access Beats central management. To use Beats central management,
          you need the privileges granted by the {beatsAdminRole} role."
        values={{ beatsAdminRole: '`beats_admin`' }}
      />
    </p>
  </NoDataLayout>
));
