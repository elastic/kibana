/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip, useEuiTheme } from '@elastic/eui';

import type { CaseUI } from '../../../common/ui/types';
import { getEmptyCellValue } from '../empty_value';
import { getExtendedFieldDisplayLabels } from './utils/extended_fields_column_utils';

const MAX_INLINE_EXTENDED_FIELD_LABELS = 2;

export interface ExtendedFieldsColumnCellProps {
  extendedFields: CaseUI['extendedFields'];
  extendedFieldsLabels: CaseUI['extendedFieldsLabels'];
}

export const ExtendedFieldsColumnCell: React.FC<ExtendedFieldsColumnCellProps> = ({
  extendedFields,
  extendedFieldsLabels,
}) => {
  const { euiTheme } = useEuiTheme();
  const labels = getExtendedFieldDisplayLabels(extendedFields, extendedFieldsLabels);

  if (labels.length === 0) {
    return getEmptyCellValue();
  }

  const inlineLabels = labels.slice(0, MAX_INLINE_EXTENDED_FIELD_LABELS);
  const truncatedSummary = `${inlineLabels.join(', ')}${
    labels.length > MAX_INLINE_EXTENDED_FIELD_LABELS ? '…' : ''
  }`;

  const listContent = (
    <ul css={{ margin: 0, paddingLeft: euiTheme.size.base }}>
      {labels.map((label, index) => (
        <li key={`${label}-${index}`}>{label}</li>
      ))}
    </ul>
  );

  return (
    <EuiToolTip
      content={listContent}
      data-test-subj="case-table-column-extended-fields-tooltip"
      position="left"
    >
      <span
        css={{ cursor: 'default' }}
        data-test-subj="case-table-column-extended-fields"
        tabIndex={0}
      >
        {truncatedSummary}
      </span>
    </EuiToolTip>
  );
};

ExtendedFieldsColumnCell.displayName = 'ExtendedFieldsColumnCell';
