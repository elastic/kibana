/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import type { AwsServiceMatrixEntry, DeploymentMethod } from '../../../aws_service_matrix';
import type { ServiceChipState } from '../../../onboarding_flow_context';
import { ServiceStatusIndicator } from './service_status_indicator';
import { DeliveryMethodBadge } from './delivery_method_badge';

interface ServiceTileProps {
  name: string;
  status: ServiceChipState;
  entry: AwsServiceMatrixEntry;
  deploymentMethod: DeploymentMethod;
}

export function ServiceTile({ name, status, entry, deploymentMethod }: ServiceTileProps) {
  return (
    <EuiPanel paddingSize="xl" hasBorder data-test-subj={`serviceTile-${entry.id}`}>
      <EuiFlexGroup direction="row" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiIcon type="checkCircle" size="l" aria-hidden color="success" />
        </EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{name}</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <ServiceStatusIndicator status={status} />
          </EuiFlexItem>
          <EuiSpacer size="xs" />
          <EuiFlexItem grow={false}>
            <DeliveryMethodBadge entry={entry} deploymentMethod={deploymentMethod} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
