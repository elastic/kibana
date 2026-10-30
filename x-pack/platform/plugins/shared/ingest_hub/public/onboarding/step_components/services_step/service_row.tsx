/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckableCard, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { SignalTypeBadge } from './signal_type_badge';
import { ServiceIcon } from './service_icon';

interface ServiceRowProps {
  service: AwsServiceMatrixEntry;
  isSelected: boolean;
  onToggle: (key: string, checked: boolean) => void;
  displayName?: string;
  /** When set, the service cannot be selected and the reason is shown in a tooltip. */
  disabledReason?: string;
}

export const ServiceRow: React.FC<ServiceRowProps> = ({
  service,
  isSelected,
  onToggle,
  displayName,
  disabledReason,
}) => {
  const row = (
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
              <SignalTypeBadge signalTypes={service.signalTypes} />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        checkableType="checkbox"
        checked={isSelected}
        disabled={disabledReason !== undefined}
        onChange={(e) => onToggle(service.id, e.target.checked)}
      />
    </div>
  );

  // The anchor takes the hover and focus: a disabled card has pointer-events: none and cannot be
  // focused, so the tooltip would never fire from the card itself.
  return disabledReason !== undefined ? (
    <EuiToolTip content={disabledReason} display="block" anchorProps={{ tabIndex: 0 }}>
      {row}
    </EuiToolTip>
  ) : (
    row
  );
};
