/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckableCard, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import type { SignalType } from '../../aws_service_matrix';
import { SignalTypeBadge } from './signal_type_badge';

export interface ServiceGroupData {
  /** policyTemplate when present, otherwise the data stream id */
  key: string;
  /** Display name taken from the group's first entry */
  name: string;
  signalTypes: SignalType[];
  /** Individual data stream ids that belong to this group */
  entryIds: string[];
}

interface ServiceRowProps {
  group: ServiceGroupData;
  isSelected: boolean;
  onToggle: (key: string, checked: boolean) => void;
}

export const ServiceRow: React.FC<ServiceRowProps> = ({ group, isSelected, onToggle }) => {
  return (
    <div data-test-subj={`servicesStep-serviceRow-${group.key}`}>
      <EuiCheckableCard
        id={`service-toggle-${group.key}`}
        label={
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{group.name}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                {group.signalTypes.map((signalType) => (
                  <EuiFlexItem key={signalType} grow={false}>
                    <SignalTypeBadge signalType={signalType} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        checkableType="checkbox"
        checked={isSelected}
        onChange={(e) => onToggle(group.key, e.target.checked)}
        data-test-subj={`servicesStep-toggle-${group.key}`}
      />
    </div>
  );
};
