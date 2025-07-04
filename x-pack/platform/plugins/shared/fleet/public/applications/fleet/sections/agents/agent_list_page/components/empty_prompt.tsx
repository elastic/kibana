/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const EmptyPrompt: React.FunctionComponent<{
  hasFleetAddAgentsPrivileges: boolean;
  setEnrollmentFlyoutState: (
    value: React.SetStateAction<{
      isOpen: boolean;
      selectedPolicyId?: string | undefined;
    }>
  ) => void;
}> = ({ hasFleetAddAgentsPrivileges, setEnrollmentFlyoutState }) => {
  return (
    <EuiEmptyPrompt
      title={
        <h2>
          <FormattedMessage
            id="xpack.fleet.agentList.noAgentsPrompt"
            defaultMessage="No agents enrolled"
          />
        </h2>
      }
      actions={
        hasFleetAddAgentsPrivileges ? (
          <EuiButton
            fill
            iconType="plusInCircle"
            onClick={() => setEnrollmentFlyoutState({ isOpen: true })}
          >
            <FormattedMessage id="xpack.fleet.agentList.addButton" defaultMessage="Add agent" />
          </EuiButton>
        ) : null
      }
    />
  );
};
