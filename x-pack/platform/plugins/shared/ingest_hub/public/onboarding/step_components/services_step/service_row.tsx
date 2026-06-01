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
import { DeliveryMethodBadge } from './delivery_method_badge';

interface ServiceRowProps {
  service: AwsServiceMatrixEntry;
  isSelected: boolean;
  onToggle: (id: string, checked: boolean) => void;
}

export const ServiceRow: React.FC<ServiceRowProps> = ({ service, isSelected, onToggle }) => {
  return (
    <div data-test-subj={`servicesStep-serviceRow-${service.id}`}>
      <EuiCheckableCard
        id={`service-toggle-${service.id}`}
        label={
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{service.name}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <SignalTypeBadge signalType={service.signalType} />
                </EuiFlexItem>
                {/* firehose not supported for V1 */}
                {service.deliveryMethods
                  .filter((entry) => entry.method !== 'firehose')
                  .map((entry) => (
                    <EuiFlexItem key={entry.method} grow={false}>
                      <DeliveryMethodBadge method={entry.method} preferred={entry.preferred} />
                    </EuiFlexItem>
                  ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        checkableType="checkbox"
        checked={isSelected}
        onChange={(e) => onToggle(service.id, e.target.checked)}
        data-test-subj={`servicesStep-toggle-${service.id}`}
      />
    </div>
  );
};
