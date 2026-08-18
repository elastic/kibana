/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckableCard, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { SignalTypeBadge } from './signal_type_badge';
import { ServiceIcon } from './service_icon';

interface ServiceRowProps {
  service: AwsServiceMatrixEntry;
  isSelected: boolean;
  onToggle: (key: string, checked: boolean) => void;
  displayName?: string;
}

export const ServiceRow: React.FC<ServiceRowProps> = ({
  service,
  isSelected,
  onToggle,
  displayName,
}) => {
  return (
    <div data-test-subj={`servicesStep-serviceRow-${service.id}`} css={{ flex: 1 }}>
      <EuiCheckableCard
        id={`service-toggle-${service.id}`}
        css={{ height: '100%' }}
        data-test-subj={`servicesStep-toggle-${service.id}`}
        label={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <ServiceIcon service={service} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{displayName ?? service.name}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SignalTypeBadge signalType={service.signalType} />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        checkableType="checkbox"
        checked={isSelected}
        onChange={(e) => onToggle(service.id, e.target.checked)}
      />
    </div>
  );
};
