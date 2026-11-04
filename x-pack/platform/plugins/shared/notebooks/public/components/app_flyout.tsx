/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiMarkdownFormat,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
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
  APP_GRID_COLUMNS,
  createEmptyApp,
  generateDefaultApp,
  getNewAppTitle,
  reconcileApps,
} from '../model/app_layout';
import { useNotebookServices } from '../services';
import { findPinnedTimeCell } from '../model/cell_factory';
import { ChartCanvas, useChartAttributes } from './chart_cell';
import { InputControl } from './input_cell';
import { useNotebook } from './notebook_context';
import { NotebookFlyout } from './notebook_flyout';
import { PinnedTimePicker } from './notebook_header';
import { ResultGrid } from './result_preview';

const APP_ROW_HEIGHT = 40;

const REMOVE_PANEL_LABEL = i18n.translate('xpack.notebook.app.removePanel', {
  defaultMessage: 'Remove from app',
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

const REMOVE_BUTTON_CLASS = 'notebookAppPanelRemove';

const AppGridPanel = ({ app, panel }: { app: NotebookApp; panel: AppPanel }) => {
  const { store } = useNotebook();
  const { euiTheme } = useEuiTheme();
  const cells = useStateFromPublishingSubject(store.cells$);
  const cell = cells[panel.cellId];
  if (!cell) return null;

  return (
    <div
      css={css`
        position: relative;
        grid-column: ${panel.x + 1} / span ${panel.width};
        grid-row: ${panel.y + 1} / span ${panel.height};
        min-width: 0;
        min-height: 0;
        overflow: auto;
        &:hover > .${REMOVE_BUTTON_CLASS}, &:focus-within > .${REMOVE_BUTTON_CLASS} {
          opacity: 1;
        }
      `}
      data-test-subj={`notebookAppPanel-${cell.name}`}
    >
      <PanelContent panelId={panel.id} cell={cell} />
      <div
        className={REMOVE_BUTTON_CLASS}
        css={css`
          position: absolute;
          top: 0;
          right: 0;
          opacity: 0;
          transition: opacity ${euiTheme.animation.fast};
        `}
      >
        <EuiToolTip content={REMOVE_PANEL_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="cross"
            size="xs"
            color="text"
            display="base"
            aria-label={REMOVE_PANEL_LABEL}
            onClick={() =>
              store.updateApp(app.id, (current) => ({
                ...current,
                panels: current.panels.filter(({ id }) => id !== panel.id),
              }))
            }
          />
        </EuiToolTip>
      </div>
    </div>
  );
};

const AppGrid = ({ app }: { app: NotebookApp }) => {
  const { euiTheme } = useEuiTheme();
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
      css={css`
        display: grid;
        grid-template-columns: repeat(${APP_GRID_COLUMNS}, minmax(0, 1fr));
        grid-auto-rows: ${APP_ROW_HEIGHT}px;
        gap: ${euiTheme.size.s};
      `}
      data-test-subj="notebookAppGrid"
    >
      {app.panels.map((panel) => (
        <AppGridPanel key={panel.id} app={app} panel={panel} />
      ))}
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
    () => apps.map(({ id, title }) => ({ id, label: title })),
    [apps]
  );
  const cells = useStateFromPublishingSubject(store.cells$);
  const cellOrder = useStateFromPublishingSubject(store.cellOrder$);
  const pinnedTime = useMemo(() => {
    const cell = findPinnedTimeCell(cells);
    return cell && appDependsOn(app, cells, cellOrder, cell.id) ? cell : undefined;
  }, [app, cells, cellOrder]);
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
    defaultMessage: 'Generate app',
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
          getAdditionalTabMenuItems={(item) => [
            {
              'data-test-subj': 'notebookAppDelete',
              name: 'deleteApp',
              label: i18n.translate('xpack.notebook.app.deleteApp', { defaultMessage: 'Delete' }),
              onClick: () => deleteTab(item),
            },
          ]}
          onEBTEvent={() => {}}
          disableTabsBarMenu
          disableCloseButton
          disableCloseTabsMenuItems
          data-test-subj="notebookAppTabs"
        />
      </EuiFlexItem>
      {pinnedTime && (
        <EuiFlexItem>
          <PinnedTimePicker cell={pinnedTime} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

/** The notebook's apps in a push flyout, beside the notebook that feeds them. */
export const AppFlyout = ({ onClose }: { onClose: () => void }) => {
  const { store, activeAppId$ } = useNotebook();
  const apps = useStateFromPublishingSubject(store.apps$);
  const activeAppId = useStateFromPublishingSubject(activeAppId$);
  const app = apps.find(({ id }) => id === activeAppId) ?? apps[0];

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
          <EuiFlyoutHeader hasBorder>
            <AppToolbar app={app} apps={apps} />
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <AppGrid app={app} />
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
