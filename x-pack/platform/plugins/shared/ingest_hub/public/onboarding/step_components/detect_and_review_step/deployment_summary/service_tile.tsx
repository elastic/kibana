/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
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
    <EuiPanel paddingSize="m" hasBorder data-test-subj={`serviceTile-${entry.id}`}>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{name}</strong>
          </EuiText>
          <ServiceStatusIndicator status={status} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DeliveryMethodBadge entry={entry} deploymentMethod={deploymentMethod} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
