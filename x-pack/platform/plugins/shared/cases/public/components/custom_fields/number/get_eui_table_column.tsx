/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RIGHT_ALIGNMENT } from '@elastic/eui';

import type { CaseCustomField } from '../../../../common/types/domain';
import type { CustomFieldEuiTableColumn } from '../types';

export const getEuiTableColumn = ({ label }: { label: string }): CustomFieldEuiTableColumn => ({
  name: label,
  // Custom number fields are numeric values between -(2^53 - 1) and 2^53 - 1.
  // Numbers are rendered using the monospace font variant
  // and can take up to 17 characters with sign.
  maxWidth: '17ch',
  minWidth: '4em',
  className: 'eui-textNumber eui-textNoWrap',
  align: RIGHT_ALIGNMENT,
  render: (customField: CaseCustomField) => {
    return (
      <span data-test-subj={`number-custom-field-column-view-${customField.key}`}>
        {customField.value}
      </span>
    );
  },
  'data-test-subj': 'number-custom-field-column',
});
