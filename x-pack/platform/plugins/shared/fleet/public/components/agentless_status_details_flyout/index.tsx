/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { MAX_FLYOUT_WIDTH } from '../../constants';
import type { Agent, AgentPolicy, PackagePolicy } from '../../types';
import { AgentlessComponentHealth } from './component_health';

export interface AgentlessStatusDetailsFlyoutProps {
  onClose: () => void;
  /** Display name shown in the flyout header. */
  policyName: string;
  /** The enrolled agentless agent whose integration health should be shown. */
  agent: Agent;
  /**
   * The agent policy associated with the agent. Only its `id` is needed (for the
   * agent policy link in the per-integration accordion), so a minimal policy is fine.
   */
  agentPolicy?: AgentPolicy;
  /** The specific package policy whose health status to display. */
  packagePolicy: PackagePolicy;
}

/**
 * A minimal flyout that shows the health status of a single agentless integration.
 * Opened from the "Details" action in the agentless table's Actions (…) menu.
 */
export const AgentlessStatusDetailsFlyout: React.FunctionComponent<
  AgentlessStatusDetailsFlyoutProps
> = ({ onClose, policyName, agent, agentPolicy, packagePolicy }) => {
  return (
    <EuiFlyout
      data-test-subj="agentlessStatusDetailsFlyout"
      onClose={onClose}
      maxWidth={MAX_FLYOUT_WIDTH}
      aria-labelledby="FleetAgentlessStatusDetailsFlyoutTitle"
    >
      <EuiFlyoutHeader hasBorder aria-labelledby="FleetAgentlessStatusDetailsFlyoutTitle">
        <EuiTitle size="m">
          <h2 id="FleetAgentlessStatusDetailsFlyoutTitle">
            {i18n.translate('xpack.fleet.agentlessStatusDetailsFlyout.title', {
              defaultMessage: '{policyName} — Status details',
              values: { policyName },
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <AgentlessComponentHealth
          policyName={policyName}
          agent={agent}
          agentPolicy={agentPolicy}
          packagePolicy={packagePolicy}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              <FormattedMessage
                id="xpack.fleet.agentlessStatusDetailsFlyout.closeFlyoutButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
