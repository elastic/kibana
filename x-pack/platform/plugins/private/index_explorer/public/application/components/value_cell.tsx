/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiText, EuiToolTip } from '@elastic/eui';
import { formatValue } from '../../../common/csv';
import type { FieldValue } from '../../../common/types';

const MAX_CELL_LENGTH = 200;
const MAX_TITLE_LENGTH = 2000;

const SINGLE_LINE_CSS = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

interface ValueCellProps {
  readonly value: FieldValue | undefined;
  /** Render on one line, cut off with an ellipsis; hover shows the full value. */
  readonly singleLine?: boolean;
}

/** Renders a single cell value, showing JSON for structures. */
export function ValueCell({ value, singleLine = false }: ValueCellProps) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = formatValue(value);
  const isStructured = typeof value === 'object';

  if (singleLine) {
    return (
      <span css={SINGLE_LINE_CSS} title={text.slice(0, MAX_TITLE_LENGTH)}>
        {isStructured ? <EuiCode transparentBackground>{text}</EuiCode> : text}
      </span>
    );
  }

  const truncated = text.length > MAX_CELL_LENGTH ? `${text.slice(0, MAX_CELL_LENGTH)}…` : text;
  const content = isStructured ? (
    <EuiCode transparentBackground>{truncated}</EuiCode>
  ) : (
    <EuiText size="s">{truncated}</EuiText>
  );
  if (truncated === text) {
    return content;
  }
  return (
    <EuiToolTip content={text.slice(0, MAX_TITLE_LENGTH)}>
      <span tabIndex={0}>{content}</span>
    </EuiToolTip>
  );
}
