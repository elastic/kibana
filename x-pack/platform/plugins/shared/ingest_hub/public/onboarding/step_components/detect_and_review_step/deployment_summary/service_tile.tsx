/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { AwsServiceMatrixEntry, DeploymentMethod } from '../../../aws_service_matrix';
import type { ServiceChipState } from '../../../onboarding_flow_context';
import type { ServiceAgentInfo } from '../use_service_data_detection';
import { ServiceStatusIndicator, type AgentErrorReason } from './service_status_indicator';
import { DeliveryMethodBadge } from './delivery_method_badge';
import { ServiceAgentStatus } from './service_agent_status';

interface ServiceTileProps {
  name: string;
  status: ServiceChipState;
  entry: AwsServiceMatrixEntry;
  deploymentMethod: DeploymentMethod;
  /** Set for services deployed through Fleet; ECF services have no agent. */
  agentInfo?: ServiceAgentInfo;
}

/**
 * Leading icon for the terminal states. Colours mirror ServiceStatusIndicator so the icon never
 * contradicts the label beside it (e.g. a success tick next to "Deployment failed").
 * In-progress states render a spinner instead — see PENDING_STATES.
 */
const STATUS_ICON: Record<string, { type: string; color: string }> = {
  receiving: { type: 'checkCircle', color: 'success' },
  timeout: { type: 'warning', color: 'warning' },
  error: { type: 'errorFill', color: 'danger' },
};

/** States that are still settling — the tile shows a spinner until one of the terminal states. */
const PENDING_STATES: ServiceChipState[] = ['instantiating', 'detecting'];

export function ServiceTile({
  name,
  status,
  entry,
  deploymentMethod,
  agentInfo,
}: ServiceTileProps) {
  const isPending = PENDING_STATES.includes(status);
  const icon = STATUS_ICON[status];
  const agentErrorReason: AgentErrorReason | undefined =
    agentInfo?.health === 'unhealthy' ? agentInfo.issue?.type ?? 'unhealthy' : undefined;

  return (
    <EuiPanel paddingSize="m" hasBorder data-test-subj={`serviceTile-${entry.id}`}>
      <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          {isPending ? (
            <EuiLoadingSpinner size="l" aria-hidden data-test-subj="serviceTile-spinner" />
          ) : (
            <EuiIcon type={icon.type} size="l" aria-hidden color={icon.color} />
          )}
        </EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false} alignItems="flexStart">
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{name}</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <ServiceStatusIndicator status={status} agentErrorReason={agentErrorReason} />
          </EuiFlexItem>
          <EuiSpacer size="xs" />
          <EuiFlexItem grow={false}>
            <DeliveryMethodBadge entry={entry} deploymentMethod={deploymentMethod} />
          </EuiFlexItem>
          {agentInfo && (
            <EuiFlexItem grow={false}>
              <ServiceAgentStatus
                name={name}
                entry={entry}
                deploymentMethod={deploymentMethod}
                agentInfo={agentInfo}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
