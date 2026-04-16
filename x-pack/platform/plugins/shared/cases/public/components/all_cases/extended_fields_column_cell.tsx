/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiToolTip } from '@elastic/eui';

import type { CaseUI } from '../../../common/ui/types';
import { getEmptyCellValue } from '../empty_value';
import { getExtendedFieldDisplayLabels } from './utils/extended_fields_column_utils';

const MAX_INLINE_EXTENDED_FIELD_LABELS = 2;

export interface ExtendedFieldsColumnCellProps {
  extendedFields: CaseUI['extendedFields'];
}

export const ExtendedFieldsColumnCell: React.FC<ExtendedFieldsColumnCellProps> = ({
  extendedFields,
}) => {
  const labels = getExtendedFieldDisplayLabels(extendedFields);

  if (labels.length === 0) {
    return getEmptyCellValue();
  }

  const inlineLabels = labels.slice(0, MAX_INLINE_EXTENDED_FIELD_LABELS);
  const truncatedSummary = `${inlineLabels.join(', ')}${
    labels.length > MAX_INLINE_EXTENDED_FIELD_LABELS ? '…' : ''
  }`;

  const listContent = (
    <ul
      css={css`
        margin: 0;
        padding-left: 1.25em;
      `}
    >
      {labels.map((label, index) => (
        <li key={`${label}-${index}`}>{label}</li>
      ))}
    </ul>
  );

  return (
    <EuiToolTip
      content={listContent}
      data-test-subj="case-table-column-extended-fields-tooltip"
      delay="regular"
      position="left"
    >
      <span
        css={css`
          cursor: default;
        `}
        data-test-subj="case-table-column-extended-fields"
        tabIndex={0}
      >
        {truncatedSummary}
      </span>
    </EuiToolTip>
  );
};

ExtendedFieldsColumnCell.displayName = 'ExtendedFieldsColumnCell';
