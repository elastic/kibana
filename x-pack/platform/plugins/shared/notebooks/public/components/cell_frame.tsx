/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
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
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { filter, skip } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { CellDefinition } from '../../common/types';
import { canShowInApp } from '../model/app_layout';
import { duplicateCell } from '../model/cell_factory';
import type { CellRuntime } from '../model/types';
import { TYPE_ICONS, getCellElementId, getStatusBorderColor, getTypeLabel } from './cell_display';
import { AddToAppButton } from './add_to_app_button';
import { CellFooter } from './cell_footer';
import { RunButton } from './run_button';
import { useNotebook } from './notebook_context';

const RUN_GUTTER_CLASS = 'notebookCellRunGutter';

const FOCUS_FADE_DURATION_MS = 1500;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const IN_VIEW_THRESHOLDS = [0.25, 0.5, 0.75, 1];

/**
 * Calls `onInView` once the element shows at least half of itself, or fills half the viewport
 * when it is taller than that; returns a function that stops waiting.
 */
const whenInView = (element: Element, onInView: () => void): (() => void) => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      const isInView =
        entry.intersectionRatio >= 0.5 || entry.intersectionRect.height >= window.innerHeight / 2;
      if (!isInView) return;
      observer.disconnect();
      onInView();
    },
    { threshold: IN_VIEW_THRESHOLDS }
  );
  observer.observe(element);
  return () => observer.disconnect();
};

const ACTIONS_LABEL = i18n.translate('xpack.notebook.cell.actions', {
  defaultMessage: 'Cell actions',
});

interface CellFrameProps {
  cell: CellDefinition;
  runtime?: CellRuntime;
  onRun?: () => void;
  headerActions?: ReactNode;
  resizeHandle?: ReactNode;
}

export const CellFrame = ({
  cell,
  runtime,
  onRun,
  headerActions,
  resizeHandle,
  children,
}: PropsWithChildren<CellFrameProps>) => {
  const { store, scheduler, openFlyouts$, focusedCell$, addedCellIds } = useNotebook();
  const isRunning = runtime?.status === 'running';
  const isFlyoutOpen = useStateFromPublishingSubject(openFlyouts$) > 0;
  const { euiTheme } = useEuiTheme();
  const borderColor = getStatusBorderColor(runtime?.status, euiTheme);
  const frameRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const flashColorsRef = useRef({ border: '', glow: '' });
  flashColorsRef.current = {
    border: `inset 0 0 0 ${euiTheme.border.width.thin} ${borderColor}`,
    glow: transparentize(euiTheme.colors.primary, 0.6),
  };

  useEffect(() => {
    let stopWaiting: (() => void) | undefined;
    const flash = () => {
      const panel = panelRef.current;
      if (!panel || window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
      stopWaiting?.();
      stopWaiting = whenInView(panel, () => {
        const { border, glow } = flashColorsRef.current;
        panel.animate(
          [
            { boxShadow: `${border}, 0 0 16px 4px ${glow}` },
            { boxShadow: `${border}, 0 0 16px 4px transparent` },
          ],
          { duration: FOCUS_FADE_DURATION_MS, easing: 'ease-out' }
        );
      });
    };
    if (addedCellIds.delete(cell.id)) flash();
    // Skip the current value so a re-subscription doesn't replay an old focus.
    const subscription = focusedCell$
      .pipe(
        skip(1),
        filter((cellId) => cellId === cell.id)
      )
      .subscribe(() => {
        frameRef.current?.focus({ preventScroll: true });
        flash();
      });
    return () => {
      subscription.unsubscribe();
      stopWaiting?.();
    };
  }, [focusedCell$, addedCellIds, cell.id]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRunMenuOpen, setIsRunMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  const relabel = (value: string): void => {
    const label = value.trim();
    store.updateCell(cell.id, ({ label: _previous, ...current }) =>
      label ? { ...current, label } : current
    );
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
        const duplicate = duplicateCell(cell, store.cells$.getValue());
        addedCellIds.add(duplicate.id);
        store.addCell(duplicate, index);
      }}
    >
      {i18n.translate('xpack.notebook.cell.duplicate', { defaultMessage: 'Duplicate' })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="delete"
      icon="trash"
      color="danger"
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
      ref={frameRef}
      tabIndex={-1}
      css={css`
        position: relative;
        outline: none;
        &:hover > .${RUN_GUTTER_CLASS}, &:focus-within > .${RUN_GUTTER_CLASS} {
          opacity: 1;
        }
      `}
    >
      <EuiPanel
        hasBorder={false}
        hasShadow={false}
        paddingSize="s"
        panelRef={panelRef}
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
              inputAriaLabel={i18n.translate('xpack.notebook.cell.labelAriaLabel', {
                defaultMessage: 'Cell label',
              })}
              placeholder={i18n.translate('xpack.notebook.cell.labelPlaceholder', {
                defaultMessage: 'Add a label',
              })}
              defaultValue={cell.label ?? ''}
              onSave={relabel}
              data-test-subj="notebookCellLabel"
            />
          </EuiFlexItem>
          <EuiFlexItem />
          {headerActions}
          {canShowInApp(cell) && (
            <EuiFlexItem grow={false}>
              <AddToAppButton cellId={cell.id} />
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
        <CellFooter cell={cell} runtime={runtime} resizeHandle={resizeHandle} />
      </EuiPanel>
      {onRun && 'runMode' in cell && !isFlyoutOpen && (
        <div
          className={RUN_GUTTER_CLASS}
          css={css`
            position: absolute;
            top: 0;
            left: 100%;
            padding-left: ${euiTheme.size.s};
            opacity: ${isRunMenuOpen || isRunning || cell.runMode === 'manual' ? 1 : 0};
            transition: opacity ${euiTheme.animation.fast};
          `}
        >
          <RunButton
            runMode={cell.runMode}
            isMenuOpen={isRunMenuOpen}
            onMenuOpenChange={setIsRunMenuOpen}
            onRun={onRun}
            isRunning={isRunning}
            onStop={() => scheduler.stopCell(cell.id)}
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
