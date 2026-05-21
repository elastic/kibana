/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';

import type { FieldHook } from '../../../../../../../shared_imports';

interface Props {
  field: FieldHook<boolean | undefined>;
  phase: 'hot' | 'cold' | 'frozen';
}

export const ForceMergeOnCloneSwitchField = ({ field, phase }: Props) => {
  const checked = field.value ?? true;

  return (
    <EuiFormRow helpText={field.helpText} fullWidth={false}>
      <EuiSwitch
        checked={checked}
        onChange={(e) => {
          field.setValue(e.target.checked);
        }}
        label={field.label}
        data-test-subj={`searchableSnapshotForceMergeOnCloneSwitch-${phase}`}
      />
    </EuiFormRow>
  );
};
