/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { createCell, type NewCellKind } from '../model/cell_factory';
import { useNotebook } from './notebook_context';

interface CellKindOption {
  kind: NewCellKind;
  icon: string;
  label: string;
}

const ROOT_PANEL_ID = 'root';

const CELL_KIND_GROUPS: ReadonlyArray<{
  id: string;
  icon: string;
  title: string;
  kinds: CellKindOption[];
}> = [
  {
    id: 'inputs',
    icon: 'controls',
    title: i18n.translate('xpack.notebook.addCell.group.inputs', { defaultMessage: 'Inputs' }),
    kinds: [
      {
        kind: 'input:time',
        icon: 'calendar',
        label: i18n.translate('xpack.notebook.addCell.time', { defaultMessage: 'Time range' }),
      },
      {
        kind: 'input:dropdown',
        icon: 'list',
        label: i18n.translate('xpack.notebook.addCell.dropdown', { defaultMessage: 'Dropdown' }),
      },
      {
        kind: 'input:range',
        icon: 'controls',
        label: i18n.translate('xpack.notebook.addCell.range', { defaultMessage: 'Range' }),
      },
    ],
  },
  {
    id: 'data',
    icon: 'database',
    title: i18n.translate('xpack.notebook.addCell.group.data', { defaultMessage: 'Data' }),
    kinds: [
      {
        kind: 'esql',
        icon: 'database',
        label: i18n.translate('xpack.notebook.addCell.esql', { defaultMessage: 'ES|QL' }),
      },
      {
        kind: 'code',
        icon: 'code',
        label: i18n.translate('xpack.notebook.addCell.code', { defaultMessage: 'JavaScript' }),
      },
    ],
  },
  {
    id: 'display',
    icon: 'eye',
    title: i18n.translate('xpack.notebook.addCell.group.display', { defaultMessage: 'Display' }),
    kinds: [
      {
        kind: 'chart',
        icon: 'visBarVertical',
        label: i18n.translate('xpack.notebook.addCell.chart', { defaultMessage: 'Chart' }),
      },
      {
        kind: 'custom',
        icon: 'sparkles',
        label: i18n.translate('xpack.notebook.addCell.custom', { defaultMessage: 'Custom' }),
      },
      {
        kind: 'markdown',
        icon: 'text',
        label: i18n.translate('xpack.notebook.addCell.markdown', { defaultMessage: 'Markdown' }),
      },
    ],
  },
];

const ADD_CELL_LABEL = i18n.translate('xpack.notebook.addCell.button', {
  defaultMessage: 'Add cell',
});

export const AddCellBar = ({
  index,
  alwaysVisible,
}: {
  index: number;
  alwaysVisible?: boolean;
}) => {
  const { store, addedCellIds } = useNotebook();
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  const add = (kind: NewCellKind) => {
    setIsOpen(false);
    const cells = store.cells$.getValue();
    const order = store.cellOrder$.getValue();
    const previousEsql = order
      .slice(0, index)
      .reverse()
      .find((id) => cells[id]?.type === 'esql');
    const takesSource = kind === 'chart' || kind === 'custom';
    const cell = createCell(kind, cells, takesSource ? previousEsql ?? null : null);
    addedCellIds.add(cell.id);
    store.addCell(cell, index);
  };

  const getLineCss = (direction: 'left' | 'right') => css`
    height: ${euiTheme.border.width.thin};
    background: linear-gradient(to ${direction}, transparent, ${euiTheme.colors.primary});
  `;

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      css={css`
        flex-grow: 0;
        width: 70%;
        align-self: center;
        margin-inline: auto;
        opacity: ${alwaysVisible || isOpen ? 1 : 0};
        transition: opacity ${euiTheme.animation.fast};
        &:hover,
        &:has(:focus-visible) {
          opacity: 1;
        }
      `}
    >
      <EuiFlexItem css={getLineCss('right')} />
      <EuiFlexItem grow={false}>
        <EuiPopover
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
          panelPaddingSize="none"
          aria-label={ADD_CELL_LABEL}
          button={
            <EuiToolTip content={ADD_CELL_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                size="xs"
                color="primary"
                iconType="plus"
                aria-label={ADD_CELL_LABEL}
                onClick={() => setIsOpen((open) => !open)}
                data-test-subj="notebookAddCell"
              />
            </EuiToolTip>
          }
        >
          <EuiContextMenu
            initialPanelId={ROOT_PANEL_ID}
            panels={[
              {
                id: ROOT_PANEL_ID,
                items: CELL_KIND_GROUPS.map(({ id, icon, title }) => ({
                  name: title,
                  icon,
                  panel: id,
                  'data-test-subj': `notebookAddCellGroup-${id}`,
                })),
              },
              ...CELL_KIND_GROUPS.map(({ id, title, kinds }) => ({
                id,
                title,
                items: kinds.map(({ kind, icon, label }) => ({
                  name: label,
                  icon,
                  onClick: () => add(kind),
                  'data-test-subj': `notebookAddCell-${kind}`,
                })),
              })),
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem css={getLineCss('left')} />
    </EuiFlexGroup>
  );
};
