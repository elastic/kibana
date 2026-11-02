/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { createCell, type NewCellKind } from '../model/cell_factory';
import { useNotebook } from './notebook_context';

const CELL_KINDS: ReadonlyArray<{ kind: NewCellKind; icon: string; label: string }> = [
  {
    kind: 'esql',
    icon: 'code',
    label: i18n.translate('xpack.notebook.addCell.esql', { defaultMessage: 'ES|QL query' }),
  },
  {
    kind: 'chart',
    icon: 'visBarVertical',
    label: i18n.translate('xpack.notebook.addCell.chart', { defaultMessage: 'Chart' }),
  },
  {
    kind: 'markdown',
    icon: 'text',
    label: i18n.translate('xpack.notebook.addCell.markdown', { defaultMessage: 'Markdown' }),
  },
  {
    kind: 'input:dropdown',
    icon: 'list',
    label: i18n.translate('xpack.notebook.addCell.dropdown', { defaultMessage: 'Dropdown input' }),
  },
  {
    kind: 'input:range',
    icon: 'controls',
    label: i18n.translate('xpack.notebook.addCell.range', { defaultMessage: 'Range input' }),
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
  const { store } = useNotebook();
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
    store.addCell(createCell(kind, cells, kind === 'chart' ? previousEsql ?? null : null), index);
  };

  return (
    <EuiFlexGroup
      justifyContent="center"
      css={css`
        flex-grow: 0;
        opacity: ${alwaysVisible || isOpen ? 1 : 0};
        transition: opacity ${euiTheme.animation.fast};
        &:hover,
        &:focus-within {
          opacity: 1;
        }
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiPopover
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
          panelPaddingSize="none"
          aria-label={ADD_CELL_LABEL}
          button={
            <EuiButtonEmpty
              size="xs"
              iconType="plusCircle"
              onClick={() => setIsOpen((open) => !open)}
              data-test-subj="notebookAddCell"
            >
              {ADD_CELL_LABEL}
            </EuiButtonEmpty>
          }
        >
          <EuiContextMenuPanel
            items={CELL_KINDS.map(({ kind, icon, label }) => (
              <EuiContextMenuItem
                key={kind}
                icon={icon}
                onClick={() => add(kind)}
                data-test-subj={`notebookAddCell-${kind}`}
              >
                {label}
              </EuiContextMenuItem>
            ))}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
