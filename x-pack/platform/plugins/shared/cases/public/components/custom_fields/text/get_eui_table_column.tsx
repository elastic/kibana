/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CustomFieldEuiTableColumn } from '../types';

export const getEuiTableColumn = ({ label }: { label: string }): CustomFieldEuiTableColumn => ({
  name: label,
  // Custom text fields can have up to 160 characters, which is way too much
  // for a single column to display in full
  maxWidth: '18em',
  minWidth: '6em',
  render: (customField) => (
    <span
      // `eui-textTruncate` CSS class is applied here instead of the `truncateText` prop
      // to allow an additional `data-test-subj` based on field's key.
      className="eui-textTruncate"
      data-test-subj={`text-custom-field-column-view-${customField.key}`}
    >
      {customField.value}
    </span>
  ),
  'data-test-subj': 'text-custom-field-column',
});
