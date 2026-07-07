/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { DocumentCountChart as DocumentCountChartRoot } from '@kbn/aiops-components';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { DocumentCountStats } from '@kbn/aiops-log-rate-analysis/types';

import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

import { TotalCountHeader } from '../document_count_content/total_count_header';

import type { EventRate } from './use_categorize_request';

interface Props {
  totalCount: number;
  pinnedCategory: Category | null;
  selectedCategory: Category | null;
  eventRate: EventRate;
  documentCountStats?: DocumentCountStats;
}

export const DocumentCountChart: FC<Props> = ({
  eventRate,
  totalCount,
  pinnedCategory,
  selectedCategory,
  documentCountStats,
}) => {
  const { data, uiSettings, fieldFormats, charts } = useAiopsAppContext();

  const chartPointsSplitLabel = i18n.translate(
    'xpack.aiops.logCategorization.chartPointsSplitLabel',
    {
      defaultMessage: 'Selected pattern',
    }
  );
  const chartPoints = useMemo(() => {
    const category = selectedCategory ?? pinnedCategory ?? null;
    return eventRate.map(({ key, docCount }) => {
      let value = docCount;
      if (category && category.sparkline && category.sparkline[key]) {
        const val = category.sparkline[key];
        value = val > docCount ? 0 : docCount - val;
      }

      return { time: key, value };
    });
  }, [eventRate, pinnedCategory, selectedCategory]);

  const chartPointsSplit = useMemo(() => {
    const category = selectedCategory ?? pinnedCategory ?? null;
    return category !== null
      ? eventRate.map(({ key, docCount }) => {
          const val = category.sparkline && category.sparkline[key] ? category.sparkline[key] : 0;
          const value = val > docCount ? docCount : val;

          return { time: key, value };
        })
      : undefined;
  }, [eventRate, pinnedCategory, selectedCategory]);

  if (documentCountStats?.interval === undefined) {
    return null;
  }

  return (
    <>
      <TotalCountHeader totalCount={totalCount} />
      <DocumentCountChartRoot
        dependencies={{ data, uiSettings, fieldFormats, charts }}
        chartPoints={chartPoints}
        chartPointsSplit={chartPointsSplit}
        timeRangeEarliest={eventRate[0].key}
        timeRangeLatest={eventRate[eventRate.length - 1].key}
        interval={documentCountStats.interval}
        chartPointsSplitLabel={chartPointsSplitLabel}
        isBrushCleared={false}
      />
    </>
  );
};
