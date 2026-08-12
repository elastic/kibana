/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFormRow } from '@elastic/eui';
import type { CaseSeverity } from '../../../../../../common';
import { SeveritySelector } from '../../../../severity/selector';
import { SEVERITY_TITLE } from '../../../../severity/translations';

interface Props {
  selectedSeverity: CaseSeverity;
  onSeverityChange: (severity: CaseSeverity) => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export const SeverityField: React.FC<Props> = ({
  selectedSeverity,
  onSeverityChange,
  isLoading,
  isDisabled,
}) => {
  return (
    <EuiFlexItem grow={false} data-test-subj="sidebar-severity">
      <EuiFormRow label={SEVERITY_TITLE} fullWidth>
        <SeveritySelector
          selectedSeverity={selectedSeverity}
          onSeverityChange={onSeverityChange}
          isLoading={isLoading}
          isDisabled={isDisabled}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
};
SeverityField.displayName = 'SeverityField';
