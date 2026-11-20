/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Axis, BarSeries, Chart, Position, ScaleType, Settings, Tooltip } from '@elastic/charts';
import { EuiPanel, EuiSkeletonRectangle, EuiSpacer, EuiTitle } from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { KI_HISTOGRAM_DAYS } from '../../../../common/constants';
import { useKiHistogram } from '../../hooks/use_ki_histogram';
import { AiIndexDetailPanelDescription } from './ai_index_detail_panel_description';

export const KNOWLEDGE_DOCUMENTS_CHART_HEIGHT = 200;
const EMPTY_COUNT_DOMAIN = { min: 0, max: 1 };

const titleLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.overview.documentsChart.title',
  {
    defaultMessage: 'Knowledge documents over time',
  }
);

const descriptionLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.overview.documentsChart.description',
  {
    defaultMessage: 'Added per day in the last {days} days (UTC).',
    values: { days: KI_HISTOGRAM_DAYS },
  }
);

const seriesLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.overview.documentsChart.seriesName',
  { defaultMessage: 'Knowledge documents added' }
);

/**
 * Formats a `YYYY-MM-DD` key as a short UTC date, so the label is the same day the server
 * counted, whatever the browser time zone.
 */
const useDayFormatter = (): ((day: string) => string) =>
  useMemo(() => {
    const format = new Intl.DateTimeFormat(i18n.getLocale(), {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    return (day: string) => {
      const time = Date.parse(`${day}T00:00:00.000Z`);
      return Number.isNaN(time) ? day : format.format(time);
    };
  }, []);

interface KnowledgeDocumentsChartPanelProps {
  aiIndexId: string;
}

/** Bar chart of the Knowledge documents added each day in the last 30 days. */
export const KnowledgeDocumentsChartPanel = ({ aiIndexId }: KnowledgeDocumentsChartPanelProps) => {
  const { buckets, isLoading, error } = useKiHistogram(aiIndexId);
  const baseTheme = useElasticChartsTheme();
  const formatDay = useDayFormatter();
  const hasAddedDocuments = buckets.some(({ count }) => count > 0);

  const renderBody = () => {
    if (isLoading) {
      return (
        <EuiSkeletonRectangle
          width="100%"
          height={KNOWLEDGE_DOCUMENTS_CHART_HEIGHT}
          data-test-subj="contextOverviewDocumentsChartLoading"
        />
      );
    }
    if (error) {
      return (
        <AiIndexDetailPanelDescription data-test-subj="contextOverviewDocumentsChartError">
          {i18n.translate('xpack.contextEngine.aiIndexDetail.overview.documentsChart.loadError', {
            defaultMessage: 'Unable to load the knowledge documents chart.',
          })}
        </AiIndexDetailPanelDescription>
      );
    }
    return (
      <>
        <Chart size={{ height: KNOWLEDGE_DOCUMENTS_CHART_HEIGHT }}>
          <Settings
            baseTheme={baseTheme}
            showLegend={false}
            locale={i18n.getLocale()}
            ariaLabel={titleLabel}
          />
          <Tooltip headerFormatter={({ value }) => formatDay(String(value))} />
          <Axis id="date" position={Position.Bottom} tickFormat={(day) => formatDay(String(day))} />
          <Axis
            id="count"
            position={Position.Left}
            integersOnly
            // All zero: keep the zero line at the bottom with only 0 and 1 as labels.
            ticks={hasAddedDocuments ? 4 : 1}
            domain={hasAddedDocuments ? undefined : EMPTY_COUNT_DOMAIN}
          />
          <BarSeries
            id="knowledgeDocumentsAdded"
            name={seriesLabel}
            xScaleType={ScaleType.Ordinal}
            yScaleType={ScaleType.Linear}
            xAccessor="date"
            yAccessors={['count']}
            data={buckets}
          />
        </Chart>
        {hasAddedDocuments ? null : (
          <AiIndexDetailPanelDescription data-test-subj="contextOverviewDocumentsChartEmpty">
            {i18n.translate('xpack.contextEngine.aiIndexDetail.overview.documentsChart.empty', {
              defaultMessage: 'No new knowledge documents in the last {days} days.',
              values: { days: KI_HISTOGRAM_DAYS },
            })}
          </AiIndexDetailPanelDescription>
        )}
      </>
    );
  };

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextOverviewDocumentsChart">
      <EuiTitle size="s">
        <h2>{titleLabel}</h2>
      </EuiTitle>
      <AiIndexDetailPanelDescription>{descriptionLabel}</AiIndexDetailPanelDescription>
      <EuiSpacer size="m" />
      {renderBody()}
    </EuiPanel>
  );
};
