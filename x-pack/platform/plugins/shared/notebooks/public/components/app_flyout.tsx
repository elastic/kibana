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
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiMarkdownFormat,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  euiShadow,
  transparentize,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { GridLayout, type GridLayoutData, type GridSettings } from '@kbn/grid-layout';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { UnifiedTabs, type TabItem } from '@kbn/unified-tabs';
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
  createEmptyApp,
  generateDefaultApp,
  getGridColumns,
  getNewAppTitle,
  reconcileApps,
  toGridLayout,
} from '../model/app_layout';
import { GRID_SUBDIVISIONS } from '../../common/constants';
import { useNotebookServices } from '../services';
import { findPinnedTimeCell } from '../model/cell_factory';
import { AppSettingsFlyout } from './app_settings_flyout';
import { AppStatusDot } from './app_status_dot';
import { ChartCanvas, useChartAttributes } from './chart_cell';
import { InputControl } from './input_cell';
import { useNotebook } from './notebook_context';
import { NotebookFlyout } from './notebook_flyout';
import { PinnedTimePicker } from './notebook_header';
import { ResultGrid } from './result_preview';

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
  return <ResultGrid table={output.table} height="100%" />;
};

const PanelContent = ({ panelId, cell }: { panelId: string; cell: CellDefinition }) => {
  switch (cell.type) {
    case 'chart':
      return <ChartPanelContent panelId={panelId} cell={cell} />;
    case 'esql':
      return <EsqlPanelContent cell={cell} />;
    case 'input':
      return <InputControl cell={cell} />;
    case 'markdown':
      return <EuiMarkdownFormat textSize="s">{cell.content}</EuiMarkdownFormat>;
  }
};

const HOVER_ACTIONS_CLASS = 'notebookAppPanelHoverActions';

const PANEL_MENU_LABEL = i18n.translate('xpack.notebook.app.panelMenu', {
  defaultMessage: 'Panel menu',
});

const MOVE_PANEL_LABEL = i18n.translate('xpack.notebook.app.movePanel', {
  defaultMessage: 'Move panel',
});

/** Dashboard-style panel chrome: a dashed outline and floating move and menu actions on hover. */
const getPanelStyles = (euiThemeContext: UseEuiTheme, isMenuOpen: boolean, inset: number) => {
  const { euiTheme } = euiThemeContext;
  const visible = css`
    z-index: ${euiTheme.levels.menu};
    opacity: 1;
    visibility: visible;
    transition: none;
  `;
  return {
    container: css`
      position: relative;
      margin: ${inset}px;
      height: calc(100% - ${inset * 2}px);
      &:hover .${HOVER_ACTIONS_CLASS}, &:has(:focus-visible) .${HOVER_ACTIONS_CLASS} {
        ${visible}
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
      ${isMenuOpen ? visible : ''}

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
      outline: ${euiTheme.border.width.thin} dashed ${euiTheme.colors.borderBaseProminent};
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
  onRevealCell: (cellId: string) => void;
  /** Space in pixels kept clear around the panel, standing in for the grid gutter. */
  inset: number;
}) => {
  const { store } = useNotebook();
  const euiThemeContext = useEuiTheme();
  const cells = useStateFromPublishingSubject(store.cells$);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const styles = useMemo(
    () => getPanelStyles(euiThemeContext, isMenuOpen, inset),
    [euiThemeContext, isMenuOpen, inset]
  );
  const dragHandleRef = useCallback(
    (element: HTMLButtonElement | null) => setDragHandles([element]),
    [setDragHandles]
  );
  const cell = cells[panel.cellId];
  if (!cell) return null;

  const closeMenu = () => setIsMenuOpen(false);
  const menuItems = [
    <EuiContextMenuItem
      key="reveal"
      icon="eye"
      onClick={() => {
        closeMenu();
        onRevealCell(cell.id);
      }}
      data-test-subj="notebookAppPanelReveal"
    >
      {i18n.translate('xpack.notebook.app.revealInNotebook', {
        defaultMessage: 'Reveal in notebook',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="remove"
      icon="trash"
      color="danger"
      onClick={() => {
        closeMenu();
        store.updateApp(app.id, (current) => ({
          ...current,
          panels: current.panels.filter(({ id }) => id !== panel.id),
        }));
      }}
      data-test-subj="notebookAppPanelRemove"
    >
      {REMOVE_PANEL_LABEL}
    </EuiContextMenuItem>,
  ];

  return (
    <div css={styles.container} data-test-subj={`notebookAppPanel-${cell.name}`}>
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
          <EuiPopover
            isOpen={isMenuOpen}
            closePopover={closeMenu}
            panelPaddingSize="none"
            anchorPosition="downRight"
            repositionOnScroll
            aria-label={PANEL_MENU_LABEL}
            button={
              <EuiToolTip content={PANEL_MENU_LABEL} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="ellipsis"
                  color="text"
                  aria-label={PANEL_MENU_LABEL}
                  onClick={() => setIsMenuOpen((open) => !open)}
                  data-test-subj="notebookAppPanelMenu"
                />
              </EuiToolTip>
            }
          >
            <EuiContextMenuPanel items={menuItems} />
          </EuiPopover>
        </span>
      </div>
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
 * Styles for the grid engine's drag preview, resize handle and drop target, matching Dashboard.
 * `dotStep` is how many engine cells apart the drop target's dots are, or undefined for none.
 * The drop preview only shows when snapping, since otherwise panels land where they're dropped.
 */
const getGridStyles = (
  euiTheme: UseEuiTheme['euiTheme'],
  { snapToGrid, dotStep }: { snapToGrid: boolean; dotStep?: number }
) => {
  const dot = (position: string) =>
    `radial-gradient(circle at ${position}, ${euiTheme.colors.accentSecondary} 1px, transparent 1px)`;
  const dots = css`
    .kbnGridSection--targeted {
      background-position: top calc((var(--kbnGridGutterSize) / 2) * -1px) left
        calc((var(--kbnGridGutterSize) / 2) * -1px);
      background-size: calc((var(--kbnGridColumnWidth) + var(--kbnGridGutterSize)) * ${dotStep}px)
        calc((var(--kbnGridRowHeight) + var(--kbnGridGutterSize)) * ${dotStep}px);
      background-image: ${dot('top left')}, ${dot('top right')}, ${dot('bottom left')},
        ${dot('bottom right')};
      background-origin: content-box;
    }
  `;
  const dropPreview = css`
    .kbnGridPanel--dragPreview {
      background-color: ${transparentize(euiTheme.colors.vis.euiColorVis0, 0.2)};
    }
  `;
  return css`
    padding-top: ${euiTheme.size.l};
    ${dotStep !== undefined && dots}
    ${snapToGrid && dropPreview}

    .kbnGridPanel--resizeHandle:after {
      display: block;
      width: 100%;
      height: 100%;
      content: '';
      mask-repeat: no-repeat;
      mask-position: bottom ${euiTheme.size.xs} right ${euiTheme.size.xs};
      mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Ccircle cx='7' cy='1' r='1'/%3E%3Ccircle cx='4' cy='4' r='1'/%3E%3Ccircle cx='7' cy='4' r='1'/%3E%3Ccircle cx='1' cy='7' r='1'/%3E%3Ccircle cx='4' cy='7' r='1'/%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3C/svg%3E");
      background-color: ${euiTheme.colors.borderBaseProminent};
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
  onRevealCell: (cellId: string) => void;
  scrollContainer: HTMLDivElement | null;
}) => {
  const { store } = useNotebook();
  const { euiTheme } = useEuiTheme();
  const snapToGrid = app.snapToGrid ?? true;
  const gutterSize = euiTheme.base / 2;
  // Without snapping, the engine works on a finer grid with no gutter; panels inset themselves by
  // half a gutter so they keep the same spacing and row height as the snapped grid.
  const scale = snapToGrid ? 1 : GRID_SUBDIVISIONS;
  const columns = getGridColumns(app);
  const layout = useMemo(() => toGridLayout(app.panels, scale), [app.panels, scale]);
  const gridSettings = useMemo<GridSettings>(
    () => ({
      gutterSize: snapToGrid ? gutterSize : 0,
      rowHeight: snapToGrid ? APP_ROW_HEIGHT : (APP_ROW_HEIGHT + gutterSize) / scale,
      columnCount: columns * scale,
      keyboardDragTopLimit: 0,
      allowGaps: app.freePlacement ?? false,
      shiftSnapSize: snapToGrid ? undefined : scale,
    }),
    [snapToGrid, gutterSize, scale, columns, app.freePlacement]
  );
  const isShiftHeld = useIsShiftHeld(!snapToGrid);
  const dotStep = snapToGrid ? 1 : isShiftHeld ? scale : undefined;
  const gridStyles = useMemo(
    () => getGridStyles(euiTheme, { snapToGrid, dotStep }),
    [euiTheme, snapToGrid, dotStep]
  );

  const onLayoutChange = useCallback(
    (next: GridLayoutData) =>
      store.updateApp(app.id, (current) => {
        const panels = applyGridLayout(current.panels, next, scale);
        return isEqual(panels, current.panels) ? current : { ...current, panels };
      }),
    [store, app.id, scale]
  );
  const panelInset = snapToGrid ? 0 : gutterSize / 2;

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
    <div data-test-subj="notebookAppGrid">
      <GridLayout
        key={`${app.freePlacement ? 'free' : 'compact'}-${snapToGrid ? 'snap' : 'fine'}-${columns}`}
        layout={layout}
        gridSettings={gridSettings}
        scrollContainer={scrollContainer}
        renderPanelContents={renderPanelContents}
        useCustomDragHandle
        onLayoutChange={onLayoutChange}
        css={gridStyles}
      />
    </div>
  );
};

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
          fill
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

const AppToolbar = ({ app, apps }: { app: NotebookApp; apps: NotebookApp[] }) => {
  const { store, activeAppId$ } = useNotebook();
  const { core } = useNotebookServices();
  const { euiTheme } = useEuiTheme();
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
    // Leaves room for the flyout's close button in the top-right corner.
    <EuiFlexGroup direction="column" gutterSize="s" css={{ paddingRight: euiTheme.size.xl }}>
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
      paddingSize="m"
      onClose={onClose}
      aria-label={i18n.translate('xpack.notebook.app.ariaLabel', { defaultMessage: 'App' })}
      data-test-subj="notebookAppFlyout"
    >
      {app ? (
        <>
          <EuiFlyoutHeader>
            <AppToolbar app={app} apps={apps} />
          </EuiFlyoutHeader>
          <EuiFlyoutBody scrollContainerRef={setBodyScrollContainer}>
            <AppHeader app={app} />
            <AppGrid app={app} onRevealCell={onRevealCell} scrollContainer={bodyScrollContainer} />
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
