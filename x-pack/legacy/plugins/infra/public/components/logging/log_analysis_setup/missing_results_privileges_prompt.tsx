/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import { UserManagementLink } from './user_management_link';

export const MissingResultsPrivilegesPrompt: React.FunctionComponent = () => (
  <EmptyPrompt
    title={
      <h2>
        <FormattedMessage
          id="xpack.infra.logs.analysis.missingMlResultsPrivilegesTitle"
          defaultMessage="Additional Machine Learning privileges required"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.infra.logs.analysis.missingMlResultsPrivilegesBody"
          defaultMessage="This feature makes use of Machine Learning jobs, which require at least the {machineLearningUserRole} role in order to access their status and results."
          values={{
            machineLearningUserRole: <EuiCode>machine_learning_user</EuiCode>,
          }}
        />
      </p>
    }
    actions={<UserManagementLink />}
  />
);

const EmptyPrompt = euiStyled(EuiEmptyPrompt)`
  align-self: center;
`;
