/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

export interface LocationStatusItem {
  key: string;
  label: string;
  isOn: boolean;
  isGroupLabel?: boolean;
  'data-test-subj': string;
}

export interface LocationStatusRowProps {
  item: LocationStatusItem;
  onIconTestSubj: string;
  offIconTestSubj: string;
  onAriaLabel: string;
  offAriaLabel: string;
}

export const LocationStatusRow: React.FC<LocationStatusRowProps> = ({
  item,
  onIconTestSubj,
  offIconTestSubj,
  onAriaLabel,
  offAriaLabel,
}) => (
  <EuiFlexItem grow={false}>
    {item.isGroupLabel ? (
      <EuiText size="xs" data-test-subj={item['data-test-subj']}>
        <strong>{item.label}</strong>
      </EuiText>
    ) : (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        data-test-subj={item['data-test-subj']}
      >
        <EuiFlexItem grow={false} data-test-subj={item.isOn ? onIconTestSubj : offIconTestSubj}>
          <EuiIcon
            type={item.isOn ? 'checkCircle' : 'cross'}
            color={item.isOn ? 'success' : 'text'}
            aria-label={item.isOn ? onAriaLabel : offAriaLabel}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{item.label}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    )}
  </EuiFlexItem>
);
