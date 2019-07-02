/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';

interface Props {
  sectionName: string;
  privilegeType: string;
  missingPrivileges: string[];
  FormattedMessage: typeof ReactIntl.FormattedMessage;
}

export const NotAuthorizedSection = ({
  sectionName,
  privilegeType,
  missingPrivileges,
  FormattedMessage,
}: Props) => (
  <EuiEmptyPrompt
    iconType="securityApp"
    title={
      <h2>
        <FormattedMessage
          id="xpack.snapshotRestore.restoreList.deniedPermissionTitle"
          defaultMessage="You're missing {privilegeType} privileges"
          values={{
            privilegeType,
          }}
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.snapshotRestore.restoreList.deniedPermissionDescription"
          defaultMessage="To view {sectionName}, you must have {privilegesCount,
                plural, one {the following privilege} other {the following privileges}}: {missingPrivileges}."
          values={{
            sectionName,
            missingPrivileges: missingPrivileges.join(', '),
            privilegesCount: missingPrivileges.length,
          }}
        />
      </p>
    }
  />
);
