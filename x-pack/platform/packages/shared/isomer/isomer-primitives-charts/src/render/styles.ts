/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartDistillery } from '../theme/distillery';

const { createStyleModule, tokens } = chartDistillery;
const { color, font, space, stroke, table } = tokens;

export const figureModule = createStyleModule('figure', ({ css }) => ({
  root: css`
    box-sizing: border-box;
    color: ${color.text};
    display: flex;
    flex-direction: column;
    font-family: ${font.family};
    font-size: ${font.size.body};
    gap: ${space.px8};
    line-height: ${font.lineHeight};
    margin: 0;
  `,
  caption: css`
    font-size: ${font.size.title};
    font-weight: ${font.weight.title};
  `,
  description: css`
    color: ${color.textSubdued};
    margin: 0;
  `,
  summary: css`
    margin: 0;
  `,
}));

export const tableModule = createStyleModule('table', ({ css }) => ({
  table: css`
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  `,
  cell: css`
    border-bottom: ${stroke.hairline} solid ${color.border};
    padding: ${table.cellPadding};
    text-align: left;
  `,
  head: css`
    color: ${color.textSubdued};
    font-weight: ${font.weight.title};
  `,
}));
