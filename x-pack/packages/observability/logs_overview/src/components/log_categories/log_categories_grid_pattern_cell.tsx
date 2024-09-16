/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { LogCategory } from '../../types';

export const logCategoriesGridPatternColumn = {
  id: 'pattern' as const,
  display: i18n.translate('xpack.observabilityLogsOverview.logCategoriesGrid.patternColumnLabel', {
    defaultMessage: 'Pattern',
  }),
  isSortable: false,
  schema: 'string',
} satisfies EuiDataGridColumn;

export interface LogCategoriesGridPatternCellProps {
  logCategory: LogCategory;
}

export const LogCategoriesGridPatternCell: React.FC<LogCategoriesGridPatternCellProps> = ({
  logCategory,
}) => {
  const theme = useEuiTheme();
  const { euiTheme } = theme;
  const termsList = useMemo(() => logCategory.terms.split(' '), [logCategory.terms]);

  const commonStyle = css`
    display: inline-block;
    font-family: ${euiTheme.font.familyCode};
    margin-right: ${euiTheme.size.xs};
  `;

  const termStyle = css`
    ${commonStyle};
  `;

  const separatorStyle = css`
    ${commonStyle};
    color: ${euiTheme.colors.successText};
  `;

  return (
    <pre>
      <div css={separatorStyle}>…</div>
      {termsList.map((term, index) => (
        <React.Fragment key={index}>
          <div css={termStyle}>{term}</div>
          <div css={separatorStyle}>…</div>
        </React.Fragment>
      ))}
    </pre>
  );
};
