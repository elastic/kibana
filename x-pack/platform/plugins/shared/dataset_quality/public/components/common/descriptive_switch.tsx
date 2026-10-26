/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiIconTip, EuiSwitch, EuiText } from '@elastic/eui';
import React from 'react';

interface DescriptiveSwitchProps {
  label: string;
  checked: boolean;
  tooltipText: string;
  onToggle: () => void;
  testSubject: string;
}

export const DescriptiveSwitch = ({
  label,
  checked,
  tooltipText,
  onToggle,
  testSubject,
}: DescriptiveSwitchProps) => {
  return (
    <EuiFlexGroup gutterSize="xs" css={{ flexGrow: 'unset' }} alignItems="center">
      <EuiSwitch
        data-test-subj={testSubject}
        compressed
        label={label}
        checked={checked}
        onChange={onToggle}
        showLabel={false}
      />
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiText size="xs">{label}</EuiText>
        <EuiIconTip content={tooltipText} position="bottom" type="question" size="s" />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
