/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';

const infoIconAriaLabel = createDatasetWizardStrings.additionalSettingsInfoIconAriaLabel;

export function FormRowLabelWithInfo({
  label,
  infoText,
}: {
  label: React.ReactNode;
  infoText: string;
}) {
  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      wrap={false}
      css={{ display: 'inline-flex' }}
    >
      <EuiFlexItem grow={false}>{label}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip content={infoText} aria-label={infoIconAriaLabel} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
