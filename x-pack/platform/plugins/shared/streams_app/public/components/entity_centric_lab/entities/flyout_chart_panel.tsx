/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiRadio,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { BehaviorSubject } from 'rxjs';
import {
  EmbeddableRendererContext,
  EmbeddableStateTransfer,
  PresentationPanel,
  type DefaultPresentationPanelApi,
  type EmbeddablePackageState,
} from '@kbn/embeddable-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public';

/** Same id as `ON_OPEN_PANEL_MENU`. Kept inline so this plugin does not take a uiActions bundle dependency. */
const PANEL_MENU_TRIGGER = 'on_open_panel_menu';
import type { FlyoutChartFrameData } from '@kbn/entity-centric-lab-flyout';
import { LazyDashboardPicker, withSuspense } from '@kbn/presentation-util-plugin/public';
import { useKibana } from '../../../hooks/use_kibana';

const COPY_TO_DASHBOARD = 'entityCentricLabCopyToDashboard';
const DOWNLOAD_CSV = 'entityCentricLabDownloadCsv';

const DashboardPicker = withSuspense(LazyDashboardPicker);

const ChartSlot = ({ children }: { readonly children: ReactNode }) => <>{children}</>;

/** Size the panel to its chart. A dashboard grid cell has a fixed height; the flyout does not. */
const chartPanelLayout = css`
  .embPanel__hoverActionsAnchor {
    height: auto;
    overflow: visible;
  }
  .embPanel {
    height: auto;
  }
  .embPanel__content {
    height: auto;
    overflow: visible;
    display: block !important;
    width: 100%;
  }
  .embPanel__content > * {
    width: 100%;
    min-width: 0;
  }
`;

/**
 * Golden-signal tiles paint their own title inside the metric, so they keep
 * the bare hover menu and no panel border.
 */
const metricTileChrome = css`
  .embPanel {
    background: transparent;
    box-shadow: none;
    border: none !important;
    outline: none !important;
  }
  .embPanel__hoverActionsAnchor .embPanel__hoverActions {
    top: auto !important;
    bottom: calc(100% - 1px);
    right: 0;
    left: auto !important;
    width: auto !important;
    height: auto !important;
    padding: 0 !important;
    justify-content: flex-end;
  }
`;

const panelApi = (
  id: string,
  title: string,
  description: string | undefined,
  hideTitle: boolean
): DefaultPresentationPanelApi => {
  const hasLockedHoverActions$ = new BehaviorSubject(false);
  return {
    uuid: id,
    title$: new BehaviorSubject<string | undefined>(title),
    description$: new BehaviorSubject<string | undefined>(description),
    hideTitle$: new BehaviorSubject<boolean | undefined>(hideTitle),
    dataLoading$: new BehaviorSubject<boolean | undefined>(false),
    hasLockedHoverActions$,
    lockHoverActions: (lock: boolean) => {
      hasLockedHoverActions$.next(lock);
    },
  };
};

const action = (
  id: string,
  order: number,
  iconType: string,
  label: string,
  onExecute: () => void
): Action => ({
  id,
  type: id,
  order,
  getIconType: () => iconType,
  getDisplayName: () => label,
  isCompatible: async () => true,
  execute: async () => {
    onExecute();
  },
});

const esqlString = (value: string): string => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

interface ChartRow {
  readonly time: string;
  readonly value: number;
  readonly series: string;
}

const chartRows = (title: string, chart?: FlyoutChartFrameData): ChartRow[] => {
  const rows: ChartRow[] = [];
  for (const line of chart?.series ?? []) {
    for (const point of line.points) {
      rows.push({
        time: new Date(point.x).toISOString(),
        value: point.y,
        series: line.label || title,
      });
    }
  }
  return rows;
};

/**
 * Inline the flyout series as ES|QL rows. Lens line and metric panels both
 * read this, so the dashboard chart is a real Lens visualization.
 */
const seriesQuery = (rows: readonly ChartRow[]): string => {
  const idx = rows.map((_, index) => index).join(', ');
  const times = rows.map((row) => esqlString(row.time)).join(', ');
  const values = rows
    .map((row) => (Number.isFinite(row.value) ? String(row.value) : 'null'))
    .join(', ');
  const series = rows.map((row) => esqlString(row.series)).join(', ');
  return [
    `ROW idx = [${idx}], t = [${times}], v = [${values}], s = [${series}]`,
    'MV_EXPAND idx',
    'EVAL time = TO_DATETIME(MV_FIRST(MV_SLICE(t, idx, idx))), value = MV_FIRST(MV_SLICE(v, idx, idx)), series = MV_FIRST(MV_SLICE(s, idx, idx))',
  ].join(' | ');
};

const dateColumn = (id: string, label: string) => ({
  columnId: id,
  fieldName: id,
  label,
  customLabel: true,
  meta: { type: 'date' },
});

const numberColumn = (
  id: string,
  label: string,
  format?: { readonly decimals: number; readonly suffix: string }
) => ({
  columnId: id,
  fieldName: id,
  label,
  customLabel: true,
  meta: { type: 'number' },
  ...(format
    ? {
        params: {
          format: {
            id: 'number',
            params: { decimals: format.decimals, suffix: format.suffix },
          },
        },
      }
    : {}),
});

const stringColumn = (id: string, label: string) => ({
  columnId: id,
  fieldName: id,
  label,
  customLabel: true,
  meta: { type: 'string' },
});

const textLayer = (query: string, columns: unknown[]) => ({
  query: { esql: query },
  columns,
  ignoreGlobalFilters: true,
});

const lensAttributes = (title: string, chart?: FlyoutChartFrameData) => {
  const rows = chartRows(title, chart);
  const fullQuery = seriesQuery(rows);
  const metric = chart?.kind === 'metric';
  const split = !metric && new Set(rows.map((row) => row.series)).size > 1;
  const lineQuery = `${fullQuery} | KEEP time, value${split ? ', series' : ''} | SORT time`;
  const trendQuery = `${fullQuery} | SORT time | KEEP time, value`;
  const shown = chart?.metric;
  const metricQuery = shown
    ? `ROW value = ${shown.value}`
    : `${fullQuery} | SORT time DESC | LIMIT 1 | KEEP value`;

  if (metric) {
    return {
      title,
      description: '',
      visualizationType: 'lnsMetric',
      references: [],
      version: 2,
      state: {
        query: { esql: metricQuery },
        filters: [],
        datasourceStates: {
          textBased: {
            layers: {
              metric: textLayer(metricQuery, [
                numberColumn(
                  'value',
                  title,
                  shown ? { decimals: shown.decimals, suffix: shown.unit } : undefined
                ),
              ]),
              trend: textLayer(trendQuery, [
                dateColumn('time', 'Time'),
                numberColumn('value', title),
              ]),
            },
          },
        },
        visualization: {
          layerId: 'metric',
          layerType: 'data',
          metricAccessor: 'value',
          subtitle: shown?.trend,
          color: shown?.color,
          applyColorTo: 'background',
          primaryPosition: 'bottom',
          titlesTextAlign: 'left',
          trendlineLayerId: 'trend',
          trendlineLayerType: 'metricTrendline',
          trendlineTimeAccessor: 'time',
          trendlineMetricAccessor: 'value',
        },
      },
    };
  }

  return {
    title,
    description: '',
    visualizationType: 'lnsXY',
    references: [],
    version: 2,
    state: {
      query: { esql: lineQuery },
      filters: [],
      datasourceStates: {
        textBased: {
          layers: {
            layer1: textLayer(lineQuery, [
              dateColumn('time', 'Time'),
              numberColumn('value', title),
              ...(split ? [stringColumn('series', 'Series')] : []),
            ]),
          },
        },
      },
      visualization: {
        legend: { isVisible: split, position: 'right' },
        valueLabels: 'hide',
        preferredSeriesType: 'line',
        layers: [
          {
            layerId: 'layer1',
            layerType: 'data',
            seriesType: 'line',
            xAccessor: 'time',
            accessors: ['value'],
            ...(split ? { splitAccessors: ['series'] } : {}),
          },
        ],
      },
    },
  };
};

/** By-value Lens panel. Lines use XY; golden signals use a single metric. */
const dashboardPanelPackage = (
  title: string,
  chart?: FlyoutChartFrameData
): EmbeddablePackageState => ({
  type: 'vis',
  size: chart?.kind === 'metric' ? { width: 16, height: 10 } : { width: 24, height: 15 },
  serializedState: {
    title,
    hide_title: chart?.kind === 'metric',
    attributes: lensAttributes(title, chart),
  },
});

/**
 * Dashboard panel chrome around a flyout chart. Line charts use the panel
 * header, so the title and description icon are the dashboard ones. Golden
 * signal tiles keep their own title inside the metric.
 */
export const StreamsFlyoutChartPanel = ({
  id,
  title,
  description,
  chart,
  notifications,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly chart?: FlyoutChartFrameData;
  readonly notifications: NotificationsStart;
  readonly children: ReactNode;
}) => {
  const { core } = useKibana();
  const [addOpen, setAddOpen] = useState(false);
  const metricTile = chart?.kind === 'metric';
  const api = useMemo(
    () => panelApi(id, title, description, metricTile),
    [id, title, description, metricTile]
  );

  const downloadCsv = useCallback(() => {
    const rows = chartRows(title, chart);
    if (!rows.length) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.streams.entityCentricLab.chartActions.downloadCsvFailed', {
          defaultMessage: 'Could not download CSV',
        }),
      });
      return;
    }
    const csv = [
      'time,value,series',
      ...rows.map(
        (row) =>
          `${row.time},${row.value},"${row.series.replace(/"/g, '""')}"`
      ),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([`${csv}\n`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    const filename = title.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'untitled';
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [chart, notifications, title]);

  const getActions = useCallback(
    async (triggerId: string) => {
      // The panel asks for every trigger with this callback. Badges render in
      // the chart header, so these two actions stay on the hover menu only.
      if (triggerId !== PANEL_MENU_TRIGGER) return [];
      return [
        action(
          COPY_TO_DASHBOARD,
          20,
          'exit',
          i18n.translate('xpack.streams.entityCentricLab.chartActions.copyToDashboard', {
            defaultMessage: 'Copy to dashboard',
          }),
          () => setAddOpen(true)
        ),
        action(
          DOWNLOAD_CSV,
          10,
          'upload',
          i18n.translate('xpack.streams.entityCentricLab.chartActions.downloadCsv', {
            defaultMessage: 'Download CSV',
          }),
          downloadCsv
        ),
      ];
    },
    [downloadCsv]
  );

  return (
    <div
      css={[chartPanelLayout, metricTile ? metricTileChrome : undefined]}
      data-test-subj={`entityCentricLabChartPanel-${id}`}
    >
      <EmbeddableRendererContext.Provider
        value={{ quickActions: { view: [] } }}
      >
        <PresentationPanel
          Component={ChartSlot}
          componentProps={{ children }}
          componentApi={api}
          getActions={getActions}
          hideHeader={metricTile}
          showBorder={!metricTile}
          showShadow={false}
          showBadges={false}
          showNotifications={false}
        />
      </EmbeddableRendererContext.Provider>
      {addOpen ? (
        <AddToDashboardModal
          title={title}
          onClose={() => setAddOpen(false)}
          onConfirm={async (dashboardId) => {
            const rows = chartRows(title, chart);
            if (!rows.length) {
              notifications.toasts.addDanger({
                title: i18n.translate(
                  'xpack.streams.entityCentricLab.chartActions.addToDashboardFailed',
                  { defaultMessage: 'Could not open the dashboard' }
                ),
              });
              return;
            }
            setAddOpen(false);
            const transfer = new EmbeddableStateTransfer(
              core.application.navigateToApp,
              core.application.currentAppId$
            );
            const path = dashboardId
              ? `#/view/${dashboardId}?_a=(viewMode:edit)`
              : '#/create';
            try {
              await transfer.navigateToWithEmbeddablePackages('dashboards', {
                path,
                state: [dashboardPanelPackage(title, chart)],
              });
            } catch (error) {
              notifications.toasts.addDanger({
                title: i18n.translate(
                  'xpack.streams.entityCentricLab.chartActions.addToDashboardFailed',
                  { defaultMessage: 'Could not open the dashboard' }
                ),
                text: error instanceof Error ? error.message : undefined,
              });
            }
          }}
        />
      ) : null}
    </div>
  );
};

const AddToDashboardModal = ({
  title,
  onClose,
  onConfirm,
}: {
  readonly title: string;
  readonly onClose: () => void;
  readonly onConfirm: (dashboardId: string | undefined) => void;
}) => {
  const [dashboardOption, setDashboardOption] = useState<'new' | 'existing'>('existing');
  const [selectedDashboard, setSelectedDashboard] = useState<{ id: string; name: string } | null>(
    null
  );
  const titleId = 'entityCentricLabAddToDashboardTitle';

  return (
    <EuiModal onClose={onClose} maxWidth={400} data-test-subj="entityCentricLabAddToDashboardModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.streams.entityCentricLab.chartActions.addToDashboardTitle', {
            defaultMessage: 'Copy to dashboard',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          hasChildLabel={false}
          label={i18n.translate('xpack.streams.entityCentricLab.chartActions.addChartLabel', {
            defaultMessage: 'Copy {chart}',
            values: { chart: title },
          })}
        >
          <div data-test-subj="add-to-dashboard-options">
            <EuiRadio
              checked={dashboardOption === 'existing'}
              id={`${titleId}-existing`}
              name={`${titleId}-option`}
              label={i18n.translate('xpack.streams.entityCentricLab.chartActions.existingDashboard', {
                defaultMessage: 'Existing dashboard',
              })}
              onChange={() => setDashboardOption('existing')}
            />
            <EuiSpacer size="s" />
            <DashboardPicker
              isDisabled={dashboardOption !== 'existing'}
              onChange={(dashboard) => {
                setSelectedDashboard(dashboard);
                setDashboardOption('existing');
              }}
            />
            <EuiSpacer size="s" />
            <EuiRadio
              checked={dashboardOption === 'new'}
              id={`${titleId}-new`}
              name={`${titleId}-option`}
              label={i18n.translate('xpack.streams.entityCentricLab.chartActions.newDashboard', {
                defaultMessage: 'New dashboard',
              })}
              onChange={() => setDashboardOption('new')}
            />
          </div>
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          {i18n.translate('xpack.streams.entityCentricLab.chartActions.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          data-test-subj="entityCentricLabAddToDashboardConfirm"
          disabled={dashboardOption === 'existing' && !selectedDashboard}
          onClick={() =>
            onConfirm(dashboardOption === 'existing' ? selectedDashboard?.id : undefined)
          }
        >
          {i18n.translate('xpack.streams.entityCentricLab.chartActions.confirm', {
            defaultMessage: 'Copy and go to dashboard',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
