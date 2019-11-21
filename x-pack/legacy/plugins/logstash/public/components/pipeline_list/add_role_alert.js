/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function AddRoleAlert() {
  return (
    <p>
      <strong>
        <FormattedMessage
          id="xpack.logstash.addRoleAlert.grantAdditionalPrivilegesTitle"
          defaultMessage="Grant additional privileges."
        />
      </strong>
      <FormattedMessage
        id="xpack.logstash.addRoleAlert.grantAdditionalPrivilegesDescription"
        defaultMessage="In Kibana Management, assign the {role} role to your Kibana user."
        values={{
          role: <EuiCode>monitoring_user</EuiCode>,
        }}
      />
    </p>
  );
}
