/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInlineEditText,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { CellDefinition, CellType } from '../../common/types';
import { CELL_NAME_PATTERN } from '../model/references';
import { duplicateCell } from '../model/cell_factory';
import type { CellRuntime } from '../model/types';
import { CellStatusBadge } from './cell_status_badge';
import { useNotebook } from './notebook_context';

const TYPE_ICONS: Record<CellType, string> = {
  esql: 'database',
  chart: 'visBarVertical',
  markdown: 'text',
  input: 'controls',
};

const RUN_LABEL = i18n.translate('xpack.notebook.cell.run', { defaultMessage: 'Run' });
const ACTIONS_LABEL = i18n.translate('xpack.notebook.cell.actions', {
  defaultMessage: 'Cell actions',
});

interface CellFrameProps {
  cell: CellDefinition;
  runtime?: CellRuntime;
  onRun?: () => void;
  headerActions?: ReactNode;
}

export const CellFrame = ({
  cell,
  runtime,
  onRun,
  headerActions,
  children,
}: PropsWithChildren<CellFrameProps>) => {
  const { store } = useNotebook();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  const rename = (name: string): boolean => {
    if (!CELL_NAME_PATTERN.test(name)) return false;
    store.updateCell(cell.id, (current) => ({ ...current, name }));
    return true;
  };

  const menuItems = [
    <EuiContextMenuItem
      key="up"
      icon="sortUp"
      onClick={() => {
        closeMenu();
        store.moveCell(cell.id, -1);
      }}
    >
      {i18n.translate('xpack.notebook.cell.moveUp', { defaultMessage: 'Move up' })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="down"
      icon="sortDown"
      onClick={() => {
        closeMenu();
        store.moveCell(cell.id, 1);
      }}
    >
      {i18n.translate('xpack.notebook.cell.moveDown', { defaultMessage: 'Move down' })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="duplicate"
      icon="copy"
      onClick={() => {
        closeMenu();
        const index = store.cellOrder$.getValue().indexOf(cell.id) + 1;
        store.addCell(duplicateCell(cell, store.cells$.getValue()), index);
      }}
    >
      {i18n.translate('xpack.notebook.cell.duplicate', { defaultMessage: 'Duplicate' })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="delete"
      icon="trash"
      onClick={() => {
        closeMenu();
        store.removeCell(cell.id);
      }}
    >
      {i18n.translate('xpack.notebook.cell.delete', { defaultMessage: 'Delete' })}
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPanel hasBorder paddingSize="s" data-test-subj={`notebookCell-${cell.name}`}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={TYPE_ICONS[cell.type]} aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ minWidth: 160 }}>
          <EuiInlineEditText
            size="s"
            inputAriaLabel={i18n.translate('xpack.notebook.cell.nameAriaLabel', {
              defaultMessage: 'Cell name',
            })}
            defaultValue={cell.name}
            onSave={rename}
          />
        </EuiFlexItem>
        {runtime && (
          <EuiFlexItem grow={false}>
            <CellStatusBadge runtime={runtime} />
          </EuiFlexItem>
        )}
        <EuiFlexItem />
        {headerActions}
        {'runMode' in cell && (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.notebook.cell.autoRunTooltip', {
                defaultMessage: 'Re-run automatically when upstream cells change',
              })}
            >
              <EuiSwitch
                compressed
                label={i18n.translate('xpack.notebook.cell.autoRun', { defaultMessage: 'Auto' })}
                checked={cell.runMode === 'auto'}
                onChange={(event) =>
                  store.updateCell(cell.id, (current) =>
                    'runMode' in current
                      ? { ...current, runMode: event.target.checked ? 'auto' : 'manual' }
                      : current
                  )
                }
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
        {onRun && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="play"
              onClick={onRun}
              data-test-subj="notebookCellRun"
            >
              {RUN_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiPopover
            isOpen={isMenuOpen}
            closePopover={closeMenu}
            panelPaddingSize="none"
            anchorPosition="downRight"
            aria-label={ACTIONS_LABEL}
            button={
              <EuiToolTip content={ACTIONS_LABEL} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="ellipsis"
                  aria-label={ACTIONS_LABEL}
                  onClick={() => setIsMenuOpen((open) => !open)}
                />
              </EuiToolTip>
            }
          >
            <EuiContextMenuPanel items={menuItems} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {runtime?.status === 'error' && runtime.error && (
        <>
          <KbnDangerCallout
            announceOnMount
            size="s"
            title={runtime.error}
            data-test-subj="notebookCellError"
          />
          <EuiSpacer size="s" />
        </>
      )}
      {children}
    </EuiPanel>
  );
};
