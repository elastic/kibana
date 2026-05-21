/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiIcon, CENTER_ALIGNMENT } from '@elastic/eui';

import type { CaseCustomField } from '../../../../common/types/domain';
import type { CustomFieldEuiTableColumn } from '../types';
import { TOGGLE_FIELD_ON_LABEL, TOGGLE_FIELD_OFF_LABEL } from '../translations';

export const getEuiTableColumn = ({ label }: { label: string }): CustomFieldEuiTableColumn => ({
  name: label,
  maxWidth: '7em',
  minWidth: '2.5em',
  align: CENTER_ALIGNMENT,
  render: (customField: CaseCustomField) => (
    <EuiIcon
      aria-label={customField.value ? TOGGLE_FIELD_ON_LABEL : TOGGLE_FIELD_OFF_LABEL}
      data-test-subj={`toggle-custom-field-column-view-${customField.key}-${
        customField?.value ? 'check' : 'cross'
      }`}
      type={customField?.value ? 'check' : 'cross'}
    />
  ),
  'data-test-subj': 'toggle-custom-field-column',
});
