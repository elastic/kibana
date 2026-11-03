/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CellDefinition, CellType } from '../../common/types';
import type { NewCellKind } from '../model/cell_factory';
import type { CellStatus } from '../model/types';

export const TYPE_ICONS: Record<CellType, string> = {
  esql: 'database',
  chart: 'visBarVertical',
  markdown: 'text',
  input: 'controls',
};

const TYPE_LABELS: Record<NewCellKind, string> = {
  esql: i18n.translate('xpack.notebook.cell.type.esql', { defaultMessage: 'ES|QL query' }),
  chart: i18n.translate('xpack.notebook.cell.type.chart', { defaultMessage: 'Chart' }),
  markdown: i18n.translate('xpack.notebook.cell.type.markdown', { defaultMessage: 'Markdown' }),
  'input:time': i18n.translate('xpack.notebook.cell.type.time', {
    defaultMessage: 'Time range input',
  }),
  'input:dropdown': i18n.translate('xpack.notebook.cell.type.dropdown', {
    defaultMessage: 'Dropdown input',
  }),
  'input:range': i18n.translate('xpack.notebook.cell.type.range', {
    defaultMessage: 'Range input',
  }),
};

export const getTypeLabel = (cell: CellDefinition): string => {
  const kind: NewCellKind = cell.type === 'input' ? `input:${cell.input.kind}` : cell.type;
  return TYPE_LABELS[kind];
};

/** Border colour that signals a cell's status; done and idle use the plain border. */
export const getStatusBorderColor = (
  status: CellStatus | undefined,
  { colors, border }: UseEuiTheme['euiTheme']
): string => {
  switch (status) {
    case 'stale':
      return colors.borderStrongWarning;
    case 'running':
      return colors.borderStrongPrimary;
    case 'error':
      return colors.borderStrongDanger;
    case 'blocked':
      return colors.borderStrongNeutral;
    default:
      return border.color;
  }
};

/** DOM id of a cell's frame, for scrolling to it. */
export const getCellElementId = (cellId: string): string => `notebookCell-${cellId}`;
