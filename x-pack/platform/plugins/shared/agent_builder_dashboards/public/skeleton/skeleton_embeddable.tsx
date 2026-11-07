/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css, keyframes } from '@emotion/react';
import { EuiBadge, EuiIcon, EuiProgress, EuiText, useEuiTheme } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { initializeStateApi, initializeTitleManager } from '@kbn/presentation-publishing';
import type { SerializedTitles } from '@kbn/presentation-publishing';
import { DASHBOARD_SKELETON_EMBEDDABLE_TYPE } from '../../common';

interface SkeletonState extends SerializedTitles {
  chart_type?: string;
}

type SkeletonShape = 'number' | 'rows' | 'ring' | 'bars';

interface ChartTypeInfo {
  icon: string;
  name: string;
  shape: SkeletonShape;
}

const pulse = keyframes({
  '0%, 100%': { opacity: 0.5 },
  '50%': { opacity: 1 },
});

const tableName = i18n.translate('xpack.agentBuilderDashboards.skeleton.chartType.table', {
  defaultMessage: 'Table',
});

const CHART_TYPES: Record<string, ChartTypeInfo> = {
  metric: {
    icon: 'visMetric',
    name: i18n.translate('xpack.agentBuilderDashboards.skeleton.chartType.metric', {
      defaultMessage: 'Metric',
    }),
    shape: 'number',
  },
  gauge: {
    icon: 'visGauge',
    name: i18n.translate('xpack.agentBuilderDashboards.skeleton.chartType.gauge', {
      defaultMessage: 'Gauge',
    }),
    shape: 'number',
  },
  xy: {
    icon: 'visLine',
    name: i18n.translate('xpack.agentBuilderDashboards.skeleton.chartType.xy', {
      defaultMessage: 'Chart',
    }),
    shape: 'bars',
  },
  datatable: { icon: 'visTable', name: tableName, shape: 'rows' },
  data_table: { icon: 'visTable', name: tableName, shape: 'rows' },
  pie: {
    icon: 'visPie',
    name: i18n.translate('xpack.agentBuilderDashboards.skeleton.chartType.pie', {
      defaultMessage: 'Pie',
    }),
    shape: 'ring',
  },
  treemap: {
    icon: 'visTreemap',
    name: i18n.translate('xpack.agentBuilderDashboards.skeleton.chartType.treemap', {
      defaultMessage: 'Treemap',
    }),
    shape: 'bars',
  },
  heatmap: {
    icon: 'visHeatmap',
    name: i18n.translate('xpack.agentBuilderDashboards.skeleton.chartType.heatmap', {
      defaultMessage: 'Heatmap',
    }),
    shape: 'bars',
  },
  tag_cloud: {
    icon: 'visTagCloud',
    name: i18n.translate('xpack.agentBuilderDashboards.skeleton.chartType.tagCloud', {
      defaultMessage: 'Tag cloud',
    }),
    shape: 'bars',
  },
  waffle: {
    icon: 'visPie',
    name: i18n.translate('xpack.agentBuilderDashboards.skeleton.chartType.waffle', {
      defaultMessage: 'Waffle',
    }),
    shape: 'ring',
  },
  mosaic: {
    icon: 'visTreemap',
    name: i18n.translate('xpack.agentBuilderDashboards.skeleton.chartType.mosaic', {
      defaultMessage: 'Mosaic',
    }),
    shape: 'bars',
  },
};

const FALLBACK_CHART_TYPE: ChartTypeInfo = {
  icon: 'visualizeApp',
  name: i18n.translate('xpack.agentBuilderDashboards.skeleton.chartType.panel', {
    defaultMessage: 'Panel',
  }),
  shape: 'bars',
};

const buildingTitle = i18n.translate('xpack.agentBuilderDashboards.skeleton.buildingTitle', {
  defaultMessage: 'Building panel…',
});

const statusLabel = i18n.translate('xpack.agentBuilderDashboards.skeleton.status', {
  defaultMessage: 'Generating query and chart…',
});

const BAR_HEIGHTS = [35, 60, 45, 80, 65, 90] as const;
const ROW_WIDTHS = [100, 85, 92, 70] as const;

const getStyles = ({ euiTheme }: UseEuiTheme) => {
  const placeholder = {
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    borderRadius: euiTheme.border.radius.small,
    animation: `${pulse} 1.6s ease-in-out infinite`,
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  };
  return {
    root: css({
      flex: '1 1 100%',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: euiTheme.size.s,
      padding: euiTheme.size.m,
      overflow: 'hidden',
    }),
    header: css({
      display: 'flex',
      alignItems: 'center',
      gap: euiTheme.size.s,
      minWidth: 0,
    }),
    iconChip: css({
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: euiTheme.size.xl,
      height: euiTheme.size.xl,
      borderRadius: euiTheme.border.radius.medium,
      backgroundColor: euiTheme.colors.backgroundBaseAccent,
    }),
    title: css({
      flex: '1 1 auto',
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      fontWeight: euiTheme.font.weight.semiBold,
    }),
    body: css({
      flex: '1 1 auto',
      minHeight: 0,
      display: 'flex',
      overflow: 'hidden',
    }),
    number: css({
      flexDirection: 'column',
      justifyContent: 'center',
      gap: euiTheme.size.s,
    }),
    numberValue: css({ ...placeholder, width: '45%', height: euiTheme.size.xxl }),
    numberCaption: css({ ...placeholder, width: '70%', height: euiTheme.size.s }),
    rows: css({
      flexDirection: 'column',
      justifyContent: 'center',
      gap: euiTheme.size.s,
    }),
    row: css({ ...placeholder, height: euiTheme.size.m }),
    ring: css({ alignItems: 'center', justifyContent: 'center' }),
    ringShape: css({
      ...placeholder,
      aspectRatio: '1 / 1',
      height: '90%',
      borderRadius: '50%',
      backgroundColor: 'transparent',
      border: `${euiTheme.size.base} solid ${euiTheme.colors.backgroundBaseSubdued}`,
    }),
    bars: css({
      alignItems: 'flex-end',
      gap: euiTheme.size.xs,
    }),
    bar: css({ ...placeholder, flex: '1 1 0' }),
    status: css({ flex: 'none' }),
  };
};

const SkeletonBody = ({
  shape,
  styles,
}: {
  shape: SkeletonShape;
  styles: ReturnType<typeof getStyles>;
}) => {
  switch (shape) {
    case 'number':
      return (
        <div css={[styles.body, styles.number]} aria-hidden="true">
          <div css={styles.numberValue} />
          <div css={styles.numberCaption} />
        </div>
      );
    case 'rows':
      return (
        <div css={[styles.body, styles.rows]} aria-hidden="true">
          {ROW_WIDTHS.map((width, index) => (
            <div
              key={index}
              css={styles.row}
              style={{ width: `${width}%`, animationDelay: `${index * 150}ms` }}
            />
          ))}
        </div>
      );
    case 'ring':
      return (
        <div css={[styles.body, styles.ring]} aria-hidden="true">
          <div css={styles.ringShape} />
        </div>
      );
    default:
      return (
        <div css={[styles.body, styles.bars]} aria-hidden="true">
          {BAR_HEIGHTS.map((height, index) => (
            <div
              key={index}
              css={styles.bar}
              style={{ height: `${height}%`, animationDelay: `${index * 100}ms` }}
            />
          ))}
        </div>
      );
  }
};

export const skeletonEmbeddableFactory: EmbeddablePublicDefinition<
  SkeletonState,
  DefaultEmbeddableApi<SkeletonState>
> = {
  type: DASHBOARD_SKELETON_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const titleManager = initializeTitleManager(initialState);

    const stateApi = initializeStateApi<SkeletonState>({
      uuid,
      parentApi,
      serializeState: () => ({
        ...titleManager.getLatestState(),
        chart_type: initialState.chart_type,
      }),
      anyStateChange$: titleManager.anyStateChange$,
      getComparators: () => ({
        title: 'skip',
        description: 'skip',
        hide_title: 'skip',
        hide_border: 'skip',
        chart_type: 'skip',
      }),
      applySerializedState: (nextState) => titleManager.reinitializeState(nextState),
    });

    const api = finalizeApi(stateApi);

    return {
      api,
      Component: function SkeletonEmbeddableComponent() {
        const euiThemeContext = useEuiTheme();
        const styles = getStyles(euiThemeContext);
        const chartType =
          (initialState.chart_type && CHART_TYPES[initialState.chart_type]) || FALLBACK_CHART_TYPE;

        return (
          <div css={styles.root} data-test-subj="agentBuilderDashboardSkeletonPanel">
            <div css={styles.header}>
              <div css={styles.iconChip}>
                <EuiIcon type={chartType.icon} color="primary" aria-hidden="true" />
              </div>
              <EuiText size="s" css={styles.title}>
                {initialState.title || buildingTitle}
              </EuiText>
              <EuiBadge color="hollow">{chartType.name}</EuiBadge>
            </div>
            <SkeletonBody shape={chartType.shape} styles={styles} />
            <div css={styles.status}>
              <EuiProgress size="xs" color="primary" position="static" />
              <EuiText size="xs" color="subdued">
                {statusLabel}
              </EuiText>
            </div>
          </div>
        );
      },
    };
  },
};
