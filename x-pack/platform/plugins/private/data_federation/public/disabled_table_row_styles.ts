/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

export const DISABLED_TABLE_ROW_CLASS = 'dataFederationTableRow--disabled';

export const EMPTY_DISABLED_DATA_SOURCE_NAMES: ReadonlySet<string> = new Set();

export const getDisabledTableRowCss = (euiTheme: EuiThemeComputed) => css`
  .${DISABLED_TABLE_ROW_CLASS} .euiTableCellContent,
  .${DISABLED_TABLE_ROW_CLASS} .euiLink,
  .${DISABLED_TABLE_ROW_CLASS} .euiHealth,
  .${DISABLED_TABLE_ROW_CLASS} .euiHealth__text {
    color: ${euiTheme.colors.textDisabled};
  }
`;
