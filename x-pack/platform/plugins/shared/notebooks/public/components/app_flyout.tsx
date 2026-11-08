/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isEqual } from 'lodash';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  copyToClipboard,
  euiShadow,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { GridLayout, type GridLayoutData, type GridSettings } from '@kbn/grid-layout';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { UnifiedTabs, type TabItem, type TabMenuItem } from '@kbn/unified-tabs';
import useObservable from 'react-use/lib/useObservable';
import { v4 as uuidv4 } from 'uuid';
import type {
  AppPanel,
  CellDefinition,
  ChartCellDefinition,
  NotebookApp,
} from '../../common/types';
import {
  appDependsOn,
  applyGridLayout,
  canShowInApp,
  createEmptyApp,
  generateDefaultApp,
  getGridColumns,
  getNewAppTitle,
  reconcileApps,
  toGridLayout,
} from '../model/app_layout';
import type { AppCellDefinition } from '../model/app_layout';
import {
  APP_ID,
  DEFAULT_GRID_GAP,
  GRID_SUBDIVISIONS,
  getNotebookAppPath,
} from '../../common/constants';
import { useNotebookServices } from '../services';
import { findPinnedTimeCell } from '../model/cell_factory';
import { AppSettingsFlyout } from './app_settings_flyout';
import { AppStatusDot } from './app_status_dot';
import { ChartCanvas, useChartAttributes } from './chart_cell';
import { CustomCanvas } from './custom_cell';
import { InputControl } from './input_cell';
import { useNotebook } from './notebook_context';
import { NotebookFlyout } from './notebook_flyout';
import { PinnedTimePicker } from './notebook_header';
import { VegaCanvas } from './vega_cell';
import { PanelResultGrid } from './result_preview';

const APP_ROW_HEIGHT = 40;

const REMOVE_PANEL_LABEL = i18n.translate('xpack.notebook.app.removePanel', {
  defaultMessage: 'Remove',
});

const ChartPanelContent = ({ panelId, cell }: { panelId: string; cell: ChartCellDefinition }) => {
  const attributes = useChartAttributes(cell);
  return (
    <ChartCanvas
      id={`notebook-app-chart-${panelId}`}
      attributes={attributes}
      hasSource={cell.sourceCell !== null}
    />
  );
};

const EsqlPanelContent = ({ cell }: { cell: CellDefinition }) => {
  const { store } = useNotebook();
  const { output } = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  if (output?.kind !== 'table') {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.notebook.app.noResults', {
          defaultMessage: 'Run the query to see its results.',
        })}
      </EuiText>
    );
  }
  return <PanelResultGrid table={output.table} />;
};

const PanelContent = ({ panelId, cell }: { panelId: string; cell: AppCellDefinition }) => {
  switch (cell.type) {
    case 'chart':
      return <ChartPanelContent panelId={panelId} cell={cell} />;
    case 'custom':
      return <CustomCanvas cell={cell} />;
    case 'vega':
      return <VegaCanvas cell={cell} />;
    case 'esql':
      return <EsqlPanelContent cell={cell} />;
    case 'input':
      return <InputControl cell={cell} />;
    case 'markdown':
      return <EuiMarkdownFormat textSize="s">{cell.content}</EuiMarkdownFormat>;
  }
};

const HOVER_ACTIONS_CLASS = 'notebookAppPanelHoverActions';

const REVEAL_PANEL_LABEL = i18n.translate('xpack.notebook.app.revealInNotebook', {
  defaultMessage: 'Reveal in notebook',
});

const MOVE_PANEL_LABEL = i18n.translate('xpack.notebook.app.movePanel', {
  defaultMessage: 'Move panel',
});

/**
 * Dashboard-style panel chrome. While editing: a dashed outline and floating move, reveal and
 * remove actions on hover.
 */
const getPanelStyles = (euiThemeContext: UseEuiTheme, inset: number, isEditable: boolean) => {
  const { euiTheme } = euiThemeContext;
  return {
    container: css`
      position: relative;
      margin: ${inset}px;
      height: calc(100% - ${inset * 2}px);
      &:hover .${HOVER_ACTIONS_CLASS}, &:has(:focus-visible) .${HOVER_ACTIONS_CLASS} {
        z-index: ${euiTheme.levels.menu};
        opacity: 1;
        visibility: visible;
        transition: none;
      }
    `,
    hoverActions: css`
      position: absolute;
      top: -${euiTheme.size.l};
      left: 0;
      right: 0;
      height: ${euiTheme.size.xl};
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 ${euiTheme.size.m};
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity ${euiTheme.animation.extraFast} ease-in,
        visibility ${euiTheme.animation.extraFast} linear;
      transition-delay: ${euiTheme.animation.fast};

      & > * {
        display: flex;
        align-items: center;
        height: ${euiTheme.size.xl};
        pointer-events: all;
        padding: calc(${euiTheme.size.xs} - 1px);
        border-radius: ${euiTheme.border.radius.small};
        background-color: ${euiTheme.colors.backgroundBasePlain};
        ${euiShadow(euiThemeContext, 'xs')}
      }
    `,
    dragHandle: css`
      display: flex;
      padding: ${euiTheme.size.xs};
      border: none;
      background: none;
      cursor: move;
    `,
    content: css`
      height: 100%;
      min-width: 0;
      overflow: auto;
      padding: ${euiTheme.size.s};
      border-radius: ${euiTheme.border.radius.small};
      ${isEditable &&
      `outline: ${euiTheme.border.width.thin} dashed ${euiTheme.colors.borderBaseProminent};`}
      background-color: ${euiTheme.colors.backgroundBasePlain};
    `,
  };
};

const AppGridPanel = ({
  app,
  panel,
  setDragHandles,
  onRevealCell,
  inset,
}: {
  app: NotebookApp;
  panel: AppPanel;
  setDragHandles: (refs: Array<HTMLElement | null>) => void;
  /** Omitted for a read-only app, which shows no panel actions. */
  onRevealCell?: (cellId: string) => void;
  /** Space in pixels kept clear around the panel, standing in for the grid gutter. */
  inset: number;
}) => {
  const { store } = useNotebook();
  const euiThemeContext = useEuiTheme();
  const cells = useStateFromPublishingSubject(store.cells$);
  const isEditable = onRevealCell !== undefined;
  const styles = useMemo(
    () => getPanelStyles(euiThemeContext, inset, isEditable),
    [euiThemeContext, inset, isEditable]
  );
  const dragHandleRef = useCallback(
    (element: HTMLButtonElement | null) => setDragHandles([element]),
    [setDragHandles]
  );
  const cell = cells[panel.cellId];
  if (!cell || !canShowInApp(cell)) return null;

  const removePanel = () =>
    store.updateApp(app.id, (current) => ({
      ...current,
      panels: current.panels.filter(({ id }) => id !== panel.id),
    }));

  return (
    <div css={styles.container} data-test-subj={`notebookAppPanel-${cell.name}`}>
      {onRevealCell && (
        <div className={HOVER_ACTIONS_CLASS} css={styles.hoverActions}>
          <span>
            <button
              type="button"
              ref={dragHandleRef}
              aria-label={MOVE_PANEL_LABEL}
              css={styles.dragHandle}
              data-test-subj="notebookAppPanelDragHandle"
            >
              <EuiIcon type="move" color="text" aria-hidden={true} />
            </button>
          </span>
          <span>
            <EuiToolTip content={REVEAL_PANEL_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="symlink"
                color="text"
                aria-label={REVEAL_PANEL_LABEL}
                onClick={() => onRevealCell(cell.id)}
                data-test-subj="notebookAppPanelReveal"
              />
            </EuiToolTip>
            <EuiToolTip content={REMOVE_PANEL_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="minusCircle"
                color="text"
                aria-label={REMOVE_PANEL_LABEL}
                onClick={removePanel}
                data-test-subj="notebookAppPanelRemove"
              />
            </EuiToolTip>
          </span>
        </div>
      )}
      <div css={styles.content}>
        <PanelContent panelId={panel.id} cell={cell} />
      </div>
    </div>
  );
};

/** The app's title and description from its settings, with the global time picker on the right. */
const AppHeader = ({ app }: { app: NotebookApp }) => {
  const { store } = useNotebook();
  const cells = useStateFromPublishingSubject(store.cells$);
  const cellOrder = useStateFromPublishingSubject(store.cellOrder$);
  const pinnedTime = useMemo(() => {
    if (app.hideTimePicker) return undefined;
    const cell = findPinnedTimeCell(cells);
    return cell && appDependsOn(app, cells, cellOrder, cell.id) ? cell : undefined;
  }, [app, cells, cellOrder]);
  const { heading, description } = app;
  if (!heading && !description && !pinnedTime) return null;

  return (
    <>
      <EuiFlexGroup
        alignItems="flexStart"
        justifyContent="spaceBetween"
        gutterSize="m"
        responsive={false}
        data-test-subj="notebookAppHeader"
      >
        <EuiFlexItem>
          {heading && (
            <EuiTitle size="m">
              <h2 data-test-subj="notebookAppHeading">{heading}</h2>
            </EuiTitle>
          )}
          {description && (
            <EuiText
              size="s"
              color="subdued"
              css={{ whiteSpace: 'pre-wrap' }}
              data-test-subj="notebookAppDescription"
            >
              {description}
            </EuiText>
          )}
        </EuiFlexItem>
        {pinnedTime && (
          <EuiFlexItem grow={false}>
            <PinnedTimePicker cell={pinnedTime} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
};

/** Set when a drag or resize starts, so the grid can stretch to the bottom of the scroll area. */
const GRID_FILL_HEIGHT_VAR = '--notebookAppGridFillHeight';

/** Whether Shift is held down, tracked only while `enabled`. */
const useIsShiftHeld = (enabled: boolean): boolean => {
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const onKey = ({ shiftKey }: KeyboardEvent) => setIsShiftHeld(shiftKey);
    const onBlur = () => setIsShiftHeld(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', onBlur);
      setIsShiftHeld(false);
    };
  }, [enabled]);
  return isShiftHeld;
};

/**
 * Styles for the grid engine's resize handle and drop target, matching Dashboard. Dragged panels
 * stay locked to the grid, so there is no separate drop preview to style.
 * `dotStep` is how many engine cells apart the drop target's dots are, or undefined for none, and
 * `inset` matches the space panels keep clear around themselves. An editable grid keeps room above
 * its first row for the panels' hover actions.
 */
const getGridStyles = (
  euiTheme: UseEuiTheme['euiTheme'],
  { dotStep, inset, isEditable }: { dotStep?: number; inset: number; isEditable: boolean }
) => {
  const dot = (position: string) =>
    `radial-gradient(circle at ${position}, ${euiTheme.colors.accentSecondary} 1px, transparent 1px)`;
  const dots = css`
    background-position: top calc((var(--kbnGridGutterSize) / 2) * -1px) left
      calc((var(--kbnGridGutterSize) / 2) * -1px);
    background-size: calc((var(--kbnGridColumnWidth) + var(--kbnGridGutterSize)) * ${dotStep}px)
      calc((var(--kbnGridRowHeight) + var(--kbnGridGutterSize)) * ${dotStep}px);
    background-image: ${dot('top left')}, ${dot('top right')}, ${dot('bottom left')},
      ${dot('bottom right')};
    background-origin: content-box;
  `;
  return css`
    ${inset > 0 && `padding: 0 ${inset}px ${inset}px;`}
    ${isEditable && `padding-top: ${euiTheme.size.l};`}

    &:has(.kbnGridPanel--active) {
      min-height: var(${GRID_FILL_HEIGHT_VAR}, auto);
      ${dotStep !== undefined && dots}
    }

    .kbnGridPanel--resizeHandle:after {
      display: block;
      width: 100%;
      height: 100%;
      content: '';
      mask-repeat: no-repeat;
      mask-position: bottom ${euiTheme.size.s} right ${euiTheme.size.s};
      mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Ccircle cx='7' cy='1' r='1'/%3E%3Ccircle cx='4' cy='4' r='1'/%3E%3Ccircle cx='7' cy='4' r='1'/%3E%3Ccircle cx='1' cy='7' r='1'/%3E%3Ccircle cx='4' cy='7' r='1'/%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3C/svg%3E");
      background-color: ${euiTheme.colors.borderBaseProminent};
    }

    .kbnGridPanel--resizeGauge {
      z-index: ${euiTheme.levels.menu};
      padding: ${euiTheme.size.xxs};
      background-color: ${euiTheme.colors.backgroundBasePlain};
      border-top-right-radius: ${euiTheme.border.radius.small};

      & .kbnGridPanel--resizeGauge--inner {
        display: flex;
        align-items: center;
        justify-content: center;
        height: ${euiTheme.size.l};
        padding: ${euiTheme.size.xxs} ${euiTheme.size.xs};
        background-color: ${euiTheme.colors.backgroundLightAccentSecondary};
        border-radius: ${euiTheme.border.radius.small};
      }

      & .kbnGridPanel--resizeGauge--text {
        font-weight: ${euiTheme.font.weight.medium};
        color: ${euiTheme.colors.textAccentSecondary};
      }
    }

    .kbnGridPanel--resizeHandle:hover:after,
    .kbnGridPanel--resizeHandle:focus-visible:after {
      background-color: ${euiTheme.colors.vis.euiColorVis0};
    }
  `;
};

const AppGrid = ({
  app,
  onRevealCell,
  scrollContainer,
}: {
  app: NotebookApp;
  /** Omitted for a read-only app, whose layout is locked. */
  onRevealCell?: (cellId: string) => void;
  scrollContainer?: HTMLDivElement | null;
}) => {
  const { store } = useNotebook();
  const { euiTheme } = useEuiTheme();
  const snapToGrid = app.snapToGrid ?? true;
  const gutterSize = app.gridGap ?? DEFAULT_GRID_GAP;
  // Without snapping, the engine works on a finer grid with no gutter; panels inset themselves by
  // half a gutter so they keep the same spacing and row height as the snapped grid.
  const scale = snapToGrid ? 1 : GRID_SUBDIVISIONS;
  const columns = getGridColumns(app);
  const layout = useMemo(() => toGridLayout(app.panels, scale), [app.panels, scale]);
  const isShiftHeld = useIsShiftHeld(!snapToGrid);
  const gridSettings = useMemo<GridSettings>(
    () => ({
      gutterSize: snapToGrid ? gutterSize : 0,
      rowHeight: snapToGrid ? APP_ROW_HEIGHT : (APP_ROW_HEIGHT + gutterSize) / scale,
      columnCount: columns * scale,
      keyboardDragTopLimit: 0,
      allowGaps: app.freePlacement ?? false,
      shiftSnapSize: snapToGrid ? undefined : scale,
      showResizeGauge: snapToGrid || isShiftHeld,
      resizeGaugeScale: scale,
      lockActivePanelToGrid: true,
      animatePanelMoves: snapToGrid,
    }),
    [snapToGrid, gutterSize, scale, columns, app.freePlacement, isShiftHeld]
  );
  const panelInset = snapToGrid ? 0 : gutterSize / 2;
  const dotStep = snapToGrid ? 1 : isShiftHeld ? scale : undefined;
  const isEditable = onRevealCell !== undefined;
  const gridStyles = useMemo(
    () => getGridStyles(euiTheme, { dotStep, inset: panelInset, isEditable }),
    [euiTheme, dotStep, panelInset, isEditable]
  );

  const onLayoutChange = useCallback(
    (next: GridLayoutData) =>
      store.updateApp(app.id, (current) => {
        const panels = applyGridLayout(current.panels, next, scale);
        return isEqual(panels, current.panels) ? current : { ...current, panels };
      }),
    [store, app.id, scale]
  );

  const renderPanelContents = useCallback(
    (panelId: string, setDragHandles: (refs: Array<HTMLElement | null>) => void) => {
      const panel = app.panels.find(({ id }) => id === panelId);
      return panel ? (
        <AppGridPanel
          app={app}
          panel={panel}
          setDragHandles={setDragHandles}
          onRevealCell={onRevealCell}
          inset={panelInset}
        />
      ) : null;
    },
    [app, onRevealCell, panelInset]
  );

  const measureFillHeight = useCallback(
    ({ currentTarget }: React.SyntheticEvent<HTMLDivElement>) => {
      if (!scrollContainer) return;
      // Stop short of the scroll area's edge: overflowing it would show a scrollbar mid-drag,
      // narrowing every column until the drag ends.
      const { top } = scrollContainer.getBoundingClientRect();
      const { clientTop, clientHeight } = scrollContainer;
      const paddingBottom = parseFloat(getComputedStyle(scrollContainer).paddingBottom) || 0;
      const contentBottom = top + clientTop + clientHeight - paddingBottom;
      const fillHeight = Math.floor(contentBottom - currentTarget.getBoundingClientRect().top);
      currentTarget.style.setProperty(GRID_FILL_HEIGHT_VAR, `${Math.max(0, fillHeight)}px`);
    },
    [scrollContainer]
  );

  if (app.panels.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="dashboardApp"
        titleSize="xs"
        body={i18n.translate('xpack.notebook.app.emptyApp', {
          defaultMessage: 'Use "Add to app" on a cell to place it here.',
        })}
      />
    );
  }
  return (
    <div
      data-test-subj="notebookAppGrid"
      onMouseDownCapture={measureFillHeight}
      onTouchStartCapture={measureFillHeight}
      onKeyDownCapture={measureFillHeight}
    >
      <GridLayout
        key={`${app.freePlacement ? 'free' : 'compact'}-${snapToGrid ? 'snap' : 'fine'}-${columns}`}
        layout={layout}
        gridSettings={gridSettings}
        accessMode={onRevealCell ? 'EDIT' : 'VIEW'}
        scrollContainer={scrollContainer}
        renderPanelContents={renderPanelContents}
        useCustomDragHandle
        onLayoutChange={onLayoutChange}
        css={gridStyles}
      />
    </div>
  );
};

/** The app's background color, for the element that contains its view. */
export const getAppBackgroundStyles = ({ backgroundColor }: NotebookApp) =>
  backgroundColor ? css({ backgroundColor }) : undefined;

/** The app's header and panels; read-only, with a locked layout, when `onRevealCell` is omitted. */
export const AppView = ({
  app,
  onRevealCell,
  scrollContainer,
}: {
  app: NotebookApp;
  onRevealCell?: (cellId: string) => void;
  scrollContainer?: HTMLDivElement | null;
}) => (
  <>
    <AppHeader app={app} />
    <AppGrid app={app} onRevealCell={onRevealCell} scrollContainer={scrollContainer} />
  </>
);

const NoApps = () => {
  const { store, activeAppId$ } = useNotebook();
  const addApp = (app: NotebookApp) => {
    store.addApp(app);
    activeAppId$.next(app.id);
  };
  return (
    <EuiEmptyPrompt
      iconType="dashboardApp"
      title={
        <h2>
          {i18n.translate('xpack.notebook.app.noAppsTitle', { defaultMessage: 'No apps yet' })}
        </h2>
      }
      titleSize="xs"
      body={i18n.translate('xpack.notebook.app.noAppsBody', {
        defaultMessage:
          'An app shows chosen cells as a dashboard. Generate one from the whole notebook, or start empty and add cells to it.',
      })}
      actions={[
        <EuiButton
          key="generate"
          size="s"
          iconType="sparkles"
          onClick={() =>
            addApp(
              generateDefaultApp(
                store.cells$.getValue(),
                store.cellOrder$.getValue(),
                getNewAppTitle(store.apps$.getValue())
              )
            )
          }
          data-test-subj="notebookAppGenerate"
        >
          {i18n.translate('xpack.notebook.app.generate', { defaultMessage: 'Generate app' })}
        </EuiButton>,
        <EuiButtonEmpty
          key="empty"
          size="s"
          onClick={() => addApp(createEmptyApp(store.apps$.getValue()))}
          data-test-subj="notebookAppCreateEmpty"
        >
          {i18n.translate('xpack.notebook.app.createEmpty', { defaultMessage: 'Start empty' })}
        </EuiButtonEmpty>,
      ]}
      data-test-subj="notebookNoApps"
    />
  );
};

const MAX_APPS = 20;

/** Tab menu items that open or share the app's own page, which only a saved notebook has. */
const useAppLinkMenuItems = (): ((appId: string) => TabMenuItem[]) => {
  const { store, notebookId } = useNotebook();
  const { core } = useNotebookServices();
  const isDirty = useObservable(store.isDirty$, false);
  return (appId) => {
    if (!notebookId) return [];
    const url = core.application.getUrlForApp(APP_ID, {
      path: getNotebookAppPath(notebookId, appId),
      absolute: true,
    });
    return [
      {
        'data-test-subj': 'notebookAppOpenInNewTab',
        name: 'openAppInNewTab',
        label: i18n.translate('xpack.notebook.app.openInNewTab', {
          defaultMessage: 'Open in new tab',
        }),
        onClick: () => window.open(url, '_blank', 'noopener,noreferrer'),
        icon: 'external',
      },
      {
        'data-test-subj': 'notebookAppCopyLink',
        name: 'copyAppLink',
        label: i18n.translate('xpack.notebook.app.copyLink', { defaultMessage: 'Copy link' }),
        onClick: () => {
          copyToClipboard(url);
          core.notifications.toasts.addSuccess({
            title: i18n.translate('xpack.notebook.app.linkCopied', {
              defaultMessage: 'Link copied',
            }),
            text: isDirty
              ? i18n.translate('xpack.notebook.app.linkCopiedUnsaved', {
                  defaultMessage: 'The link shows the last saved version of the notebook.',
                })
              : undefined,
          });
        },
        icon: 'link',
      },
    ];
  };
};

const AppToolbar = ({ app, apps }: { app: NotebookApp; apps: NotebookApp[] }) => {
  const { store, activeAppId$ } = useNotebook();
  const { core } = useNotebookServices();
  const { euiTheme } = useEuiTheme();
  const getAppLinkMenuItems = useAppLinkMenuItems();
  const confirmDelete = (deleted: readonly NotebookApp[]): Promise<boolean> =>
    core.overlays.openConfirm(
      i18n.translate('xpack.notebook.app.deleteConfirmBody', {
        defaultMessage:
          '{count, plural, one {"{title}" has} other {These apps have}} panels. Deleting {count, plural, one {it} other {them}} removes the layout but keeps the cells in the notebook.',
        values: { count: deleted.length, title: deleted[0]?.title },
      }),
      {
        title: i18n.translate('xpack.notebook.app.deleteConfirmTitle', {
          defaultMessage: 'Delete {count, plural, one {app} other {# apps}}?',
          values: { count: deleted.length },
        }),
        confirmButtonText: i18n.translate('xpack.notebook.app.deleteConfirmButton', {
          defaultMessage: 'Delete',
        }),
        buttonColor: 'danger',
        defaultFocusedButton: 'confirm',
      }
    );
  const tabs = useMemo<TabItem[]>(
    () =>
      apps.map((tabApp) => ({
        id: tabApp.id,
        label: tabApp.title,
        statusIndicator: <AppStatusDot app={tabApp} />,
      })),
    [apps]
  );
  const [settingsAppId, setSettingsAppId] = useState<string>();
  const addApp = (next: NotebookApp) => {
    store.addApp(next);
    activeAppId$.next(next.id);
  };
  const applyTabs = async (items: TabItem[], selectedId: string | undefined) => {
    const kept = new Set(items.map(({ id }) => id));
    const deleted = apps.filter(({ id, panels }) => !kept.has(id) && panels.length > 0);
    if (deleted.length > 0 && !(await confirmDelete(deleted))) return;
    store.setApps(reconcileApps(apps, items));
    activeAppId$.next(selectedId);
  };
  const deleteTab = (item: TabItem) => {
    const index = tabs.findIndex(({ id }) => id === item.id);
    const remaining = tabs.filter(({ id }) => id !== item.id);
    const selectedId =
      item.id === app.id ? remaining[Math.min(index, remaining.length - 1)]?.id : app.id;
    return applyTabs(remaining, selectedId);
  };
  const newAppLabel = i18n.translate('xpack.notebook.app.newApp', { defaultMessage: 'New app' });
  const generateAppLabel = i18n.translate('xpack.notebook.app.generateAnother', {
    defaultMessage: 'Generate new app',
  });

  return (
    // The flyout has no padding of its own, so the app runs to its edges; the extra end padding
    // leaves room for the close button in the top-right corner.
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      css={{
        padding: euiTheme.size.m,
        paddingRight: `calc(${euiTheme.size.m} + ${euiTheme.size.xl})`,
      }}
    >
      <EuiFlexItem grow={false}>
        <UnifiedTabs
          items={tabs}
          selectedItemId={app.id}
          recentlyClosedItems={[]}
          onClearRecentlyClosed={() => {}}
          maxItemsCount={MAX_APPS}
          services={{ core: { chrome: core.chrome } }}
          createItem={() => ({ id: uuidv4(), label: getNewAppTitle(apps) })}
          customNewTabButton={
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiToolTip content={newAppLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="plus"
                  color="text"
                  aria-label={newAppLabel}
                  onClick={() => addApp(createEmptyApp(apps))}
                  data-test-subj="notebookAppNew"
                />
              </EuiToolTip>
              <EuiToolTip content={generateAppLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="sparkles"
                  color="text"
                  aria-label={generateAppLabel}
                  onClick={() =>
                    addApp(
                      generateDefaultApp(
                        store.cells$.getValue(),
                        store.cellOrder$.getValue(),
                        getNewAppTitle(apps)
                      )
                    )
                  }
                  data-test-subj="notebookAppGenerateAnother"
                />
              </EuiToolTip>
            </EuiFlexGroup>
          }
          onChanged={({ items, selectedItem }) => applyTabs(items, selectedItem?.id)}
          getTopTabMenuItems={(item) => [
            ...getAppLinkMenuItems(item.id),
            {
              'data-test-subj': 'notebookAppSettings',
              name: 'appSettings',
              label: i18n.translate('xpack.notebook.app.settings', {
                defaultMessage: 'Settings',
              }),
              onClick: () => setSettingsAppId(item.id),
              icon: 'gear',
            },
            {
              'data-test-subj': 'notebookAppDelete',
              name: 'deleteApp',
              label: i18n.translate('xpack.notebook.app.deleteApp', { defaultMessage: 'Delete' }),
              onClick: () => deleteTab(item),
              color: 'danger',
              icon: 'trash',
            },
          ]}
          onEBTEvent={() => {}}
          disableTabsBarMenu
          disableCloseButton
          disableCloseTabsMenuItems
          showTabMenuItemIcons
          data-test-subj="notebookAppTabs"
        />
      </EuiFlexItem>
      {settingsAppId && (
        <AppSettingsFlyout appId={settingsAppId} onClose={() => setSettingsAppId(undefined)} />
      )}
    </EuiFlexGroup>
  );
};

/** The notebook's apps in a push flyout, beside the notebook that feeds them. */
export const AppFlyout = ({
  onClose,
  onRevealCell,
}: {
  onClose: () => void;
  /** Scrolls the notebook to the cell and flashes it. */
  onRevealCell: (cellId: string) => void;
}) => {
  const { store, activeAppId$ } = useNotebook();
  const apps = useStateFromPublishingSubject(store.apps$);
  const activeAppId = useStateFromPublishingSubject(activeAppId$);
  const app = apps.find(({ id }) => id === activeAppId) ?? apps[0];
  const [bodyScrollContainer, setBodyScrollContainer] = useState<HTMLDivElement | null>(null);

  return (
    <NotebookFlyout
      type="push"
      ownFocus={false}
      paddingSize="none"
      onClose={onClose}
      aria-label={i18n.translate('xpack.notebook.app.ariaLabel', { defaultMessage: 'App' })}
      data-test-subj="notebookAppFlyout"
    >
      {app ? (
        <>
          <EuiFlyoutHeader>
            <AppToolbar app={app} apps={apps} />
          </EuiFlyoutHeader>
          <EuiFlyoutBody
            scrollContainerRef={setBodyScrollContainer}
            css={getAppBackgroundStyles(app)}
          >
            <AppView app={app} onRevealCell={onRevealCell} scrollContainer={bodyScrollContainer} />
          </EuiFlyoutBody>
        </>
      ) : (
        <EuiFlyoutBody>
          <NoApps />
        </EuiFlyoutBody>
      )}
    </NotebookFlyout>
  );
};
