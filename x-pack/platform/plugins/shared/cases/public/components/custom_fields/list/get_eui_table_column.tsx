/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type {
  CaseCustomFieldList,
  ListCustomFieldConfiguration,
} from '../../../../common/types/domain';
import type { CustomFieldEuiTableColumn } from '../types';

export const getEuiTableColumn = ({
  label,
  options,
}: Pick<
  ListCustomFieldConfiguration,
  'label' | 'options'
>): CustomFieldEuiTableColumn<CaseCustomFieldList> => ({
  name: label,
  width: '250px',
  render: (customField) => {
    const selectedKey = customField.value ? Object.keys(customField.value)[0] : null;
    return (
      <p
        className="eui-textTruncate"
        data-test-subj={`list-custom-field-column-view-${customField.key}`}
      >
        {options.find((option) => option.key === selectedKey)?.label ?? null}
      </p>
    );
  },
  'data-test-subj': 'list-custom-field-column',
});
