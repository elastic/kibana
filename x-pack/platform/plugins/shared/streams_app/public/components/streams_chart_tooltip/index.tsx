/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TooltipContainer,
  TooltipTable,
  TooltipTableBody,
  TooltipTableCell,
  TooltipTableColorCell,
  TooltipTableHeader,
  TooltipTableRow,
} from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';

export function StreamsChartTooltip({
  header,
  label,
  color,
}: {
  header?: React.ReactNode;
  label: React.ReactNode;
  color: string;
}) {
  const theme = useEuiTheme().euiTheme;

  return (
    <TooltipContainer>
      <TooltipTable
        gridTemplateColumns="none"
        className={css`
          padding: ${theme.size.xs};
        `}
      >
        <TooltipTableBody>
          {header ? (
            <TooltipTableHeader
              className={css`
                padding: 0px ${theme.size.s};
              `}
            >
              {header}
            </TooltipTableHeader>
          ) : null}
          <TooltipTableRow>
            <TooltipTableColorCell color={color} />
            <TooltipTableCell>{label}</TooltipTableCell>
          </TooltipTableRow>
        </TooltipTableBody>
      </TooltipTable>
    </TooltipContainer>
  );
}
