/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiInlineEditText,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { CellDefinition } from '../../common/types';
import { CELL_NAME_PATTERN } from '../model/references';
import { duplicateCell } from '../model/cell_factory';
import type { CellRuntime } from '../model/types';
import { TYPE_ICONS, getCellElementId, getStatusBorderColor, getTypeLabel } from './cell_display';
import { CellFooter } from './cell_footer';
import { RunButton } from './run_button';
import { useNotebook } from './notebook_context';

const RUN_GUTTER_CLASS = 'notebookCellRunGutter';

const ACTIONS_LABEL = i18n.translate('xpack.notebook.cell.actions', {
  defaultMessage: 'Cell actions',
});

interface CellFrameProps {
  cell: CellDefinition;
  runtime?: CellRuntime;
  onRun?: () => void;
  headerActions?: ReactNode;
  /** Variable names the cell exposes to other cells, listed in the cell footer. */
  outputs?: readonly string[];
}

export const CellFrame = ({
  cell,
  runtime,
  onRun,
  headerActions,
  outputs,
  children,
}: PropsWithChildren<CellFrameProps>) => {
  const { store, openFlyouts$ } = useNotebook();
  const isFlyoutOpen = useStateFromPublishingSubject(openFlyouts$) > 0;
  const { euiTheme } = useEuiTheme();
  const borderColor = getStatusBorderColor(runtime?.status, euiTheme);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRunMenuOpen, setIsRunMenuOpen] = useState(false);
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
    <div
      id={getCellElementId(cell.id)}
      css={css`
        position: relative;
        &:hover > .${RUN_GUTTER_CLASS}, &:focus-within > .${RUN_GUTTER_CLASS} {
          opacity: 1;
        }
      `}
    >
      <EuiPanel
        hasBorder={false}
        hasShadow={false}
        paddingSize="s"
        css={css`
          box-shadow: inset 0 0 0 ${euiTheme.border.width.thin} ${borderColor};
        `}
        data-test-subj={`notebookCell-${cell.name}`}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              type={TYPE_ICONS[cell.type]}
              content={getTypeLabel(cell)}
              aria-label={getTypeLabel(cell)}
              color="text"
              position="left"
            />
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
          <EuiFlexItem />
          {headerActions}
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
        <CellFooter outputs={outputs} runtime={runtime} />
      </EuiPanel>
      {onRun && 'runMode' in cell && !isFlyoutOpen && (
        <div
          className={RUN_GUTTER_CLASS}
          css={css`
            position: absolute;
            top: 0;
            left: 100%;
            padding-left: ${euiTheme.size.s};
            opacity: ${isRunMenuOpen || cell.runMode === 'manual' ? 1 : 0};
            transition: opacity ${euiTheme.animation.fast};
          `}
        >
          <RunButton
            runMode={cell.runMode}
            isMenuOpen={isRunMenuOpen}
            onMenuOpenChange={setIsRunMenuOpen}
            onRun={onRun}
            onRunModeChange={(runMode) =>
              store.updateCell(cell.id, (current) =>
                'runMode' in current ? { ...current, runMode } : current
              )
            }
          />
        </div>
      )}
    </div>
  );
};
