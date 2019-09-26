/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import * as React from 'react';
import { NoDataLayout } from '../../components/layouts/no_data';

export const EnforceSecurityPage = injectI18n(({ intl }) => (
  <NoDataLayout
    title={intl.formatMessage({
      id: 'xpack.beatsManagement.disabledSecurityTitle',
      defaultMessage: 'Security is not enabled',
    })}
    actionSection={[]}
  >
    <p>
      <FormattedMessage
        id="xpack.beatsManagement.disabledSecurityDescription"
        defaultMessage="You must enable security in Kibana and Elasticsearch to use Beats central management."
      />
    </p>
  </NoDataLayout>
));
