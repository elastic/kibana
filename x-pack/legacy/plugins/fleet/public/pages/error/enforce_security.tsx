/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { NoDataLayout } from '../../components';

export const EnforceSecurityPage = injectI18n(({ intl }) => (
  <NoDataLayout
    title={intl.formatMessage({
      id: 'xpack.fleet.disabledSecurityTitle',
      defaultMessage: 'Security is not enabled',
    })}
    actionSection={[]}
  >
    <p>
      <FormattedMessage
        id="xpack.fleet.disabledSecurityDescription"
        defaultMessage="You must enable security in Kibana and Elasticsearch to use Elastic Fleet."
      />
    </p>
  </NoDataLayout>
));
