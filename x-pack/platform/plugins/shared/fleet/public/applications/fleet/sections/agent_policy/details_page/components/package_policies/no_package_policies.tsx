/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

import type { AgentPolicy } from '../../../../../types';
import { useAuthz } from '../../../../../hooks';

import { AddIntegrationFlyout } from './add_integration_flyout';

export const NoPackagePolicies = memo<{ agentPolicy: AgentPolicy; refreshAgentPolicy: () => void }>(
  ({ agentPolicy, refreshAgentPolicy }) => {
    const authz = useAuthz();
    const canWriteIntegrationPolicies =
      authz.integrations.writeIntegrationPolicies && authz.fleet.allAgentPolicies;
    const [showAddIntegrationFlyout, setShowAddIntegrationFlyout] = React.useState(false);

    return (
      <>
        <EuiEmptyPrompt
          iconType="plusInCircle"
          title={
            <h3>
              <FormattedMessage
                id="xpack.fleet.policyDetailsPackagePolicies.createFirstTitle"
                defaultMessage="Add your first integration"
              />
            </h3>
          }
          body={
            <FormattedMessage
              id="xpack.fleet.policyDetailsPackagePolicies.createFirstMessage"
              defaultMessage="This policy does not have any integrations yet."
            />
          }
          actions={
            <EuiButton
              iconType="plusInCircle"
              isDisabled={!canWriteIntegrationPolicies}
              fill
              onClick={() => {
                setShowAddIntegrationFlyout(true);
              }}
              data-test-subj="addPackagePolicyButton"
            >
              <FormattedMessage
                id="xpack.fleet.policyDetailsPackagePolicies.createFirstButtonText"
                defaultMessage="Add integration"
              />
            </EuiButton>
          }
        />
        {showAddIntegrationFlyout && (
          <AddIntegrationFlyout
            onClose={() => {
              setShowAddIntegrationFlyout(false);
              refreshAgentPolicy();
            }}
            agentPolicy={agentPolicy}
          />
        )}
      </>
    );
  }
);
