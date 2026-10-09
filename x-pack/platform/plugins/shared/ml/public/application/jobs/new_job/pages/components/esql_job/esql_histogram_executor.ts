/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { getESQLResults } from '@kbn/esql-utils';
import { calculateBounds } from '@kbn/data-plugin/common';
import { useMlKibana } from '../../../../../contexts/kibana';
import { useEsqlWizardContext } from './esql_wizard_context';
import {
  buildEsqlHistogramQuery,
  ESQL_HISTOGRAM_COUNT_COLUMN,
  ESQL_HISTOGRAM_TIME_COLUMN,
} from './esql_histogram_query';
import { buildEsqlSourceTimeRangeFilter } from './esql_source_time_range_filter';

const DEBOUNCE_MS = 300;

/**
 * Executes the Query & time range step's row-count-per-bucket histogram
 * client-side (LEAD DECISION 2026-09-29, g2sz.10 pass 2: reuse the same
 * ES|QL execution utility family the wizard already ships with —
 * `@kbn/esql-utils`'s `getESQLResults` over the data plugin's `search`
 * service — no new server route). Runs once at the wizard root so the
 * result (and, crucially, `histogramTotalRows`) survives navigating away
 * from and back to the Query & time range step; the gating function reads
 * it to decide whether Next is enabled.
 */
export const useEsqlHistogramExecutor = (): void => {
  const {
    services: { data },
  } = useMlKibana();
  const { state, setHistogramState } = useEsqlWizardContext();
  const requestGeneration = useRef(0);
  const abortController = useRef<AbortController>();

  const {
    query,
    emittedTimeField,
    sourceTimeField,
    wizardStart,
    wizardEnd,
    columns,
    queryProbeState,
    rangeRefreshToken,
  } = state;

  useEffect(() => {
    const generation = ++requestGeneration.current;

    abortController.current?.abort();

    if (
      queryProbeState !== 'success' ||
      columns.length === 0 ||
      emittedTimeField === '' ||
      !columns.some(({ name }) => name === emittedTimeField)
    ) {
      setHistogramState({
        histogramStatus: 'idle',
        histogramTotalRows: 0,
        histogramErrorMessage: undefined,
        histogramSeries: [],
      });
      return;
    }

    const bounds = calculateBounds({ from: wizardStart, to: wizardEnd });

    if (!bounds.min || !bounds.max) {
      setHistogramState({
        histogramStatus: 'idle',
        histogramTotalRows: 0,
        histogramErrorMessage: undefined,
        histogramSeries: [],
      });
      return;
    }

    setHistogramState({ histogramStatus: 'loading' });

    // Same raw source-time-field range filter as the step-1 output preview, so
    // rows outside the selected range cannot produce buckets (g2sz.28).
    const filter = buildEsqlSourceTimeRangeFilter({
      sourceTimeField,
      from: wizardStart,
      to: wizardEnd,
    });

    const histogramQuery = buildEsqlHistogramQuery({
      query,
      timeField: emittedTimeField,
      start: bounds.min.toISOString(),
      end: bounds.max.toISOString(),
    });

    const timeout = window.setTimeout(() => {
      const controller = new AbortController();
      abortController.current = controller;

      getESQLResults({
        esqlQuery: histogramQuery,
        search: data.search.search,
        signal: controller.signal,
        filter,
      })
        .then(({ response }) => {
          if (generation !== requestGeneration.current) return;

          const columnIndex = new Map(
            (response.columns ?? []).map((column, index) => [column.name, index])
          );
          const timeIndex = columnIndex.get(ESQL_HISTOGRAM_TIME_COLUMN);
          const countIndex = columnIndex.get(ESQL_HISTOGRAM_COUNT_COLUMN);
          const rows = (response.values ?? []) as Array<Array<number | string | null>>;

          const series =
            timeIndex === undefined || countIndex === undefined
              ? []
              : rows.map((row) => ({
                  time: new Date(row[timeIndex] as string).getTime(),
                  value: Number(row[countIndex]),
                }));

          const totalRows = series.reduce((sum, point) => sum + point.value, 0);

          setHistogramState({
            histogramStatus: 'success',
            histogramTotalRows: totalRows,
            histogramErrorMessage: undefined,
            histogramSeries: series,
          });
        })
        .catch((error: unknown) => {
          if (generation !== requestGeneration.current) return;
          if (controller.signal.aborted) return;

          setHistogramState({
            histogramStatus: 'error',
            histogramTotalRows: 0,
            histogramErrorMessage: error instanceof Error ? error.message : String(error),
            histogramSeries: [],
          });
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      abortController.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    columns,
    data.search.search,
    emittedTimeField,
    query,
    queryProbeState,
    rangeRefreshToken,
    sourceTimeField,
    wizardEnd,
    wizardStart,
  ]);
};
