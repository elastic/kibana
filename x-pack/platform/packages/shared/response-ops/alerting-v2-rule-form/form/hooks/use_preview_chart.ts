/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedValue } from '@kbn/react-hooks';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import { validateEsqlQuery } from '@kbn/alerting-v2-schemas';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { LensVisService } from '@kbn/unified-histogram';
import type { LensVisQueryParams } from '@kbn/unified-histogram';
import { useRuleFormServices } from '../contexts';
import { parseDuration } from '../utils';
import type { PreviewColumn } from './use_preview';

/** Debounce wait time in milliseconds — matches the preview grid debounce */
const DEBOUNCE_WAIT = 2000;

export interface UsePreviewChartResult {
  /** Lens attributes needed to render the chart, or undefined while building */
  lensAttributes: TypedLensByValueInput['attributes'] | undefined;
  /** Time range for the chart derived from the lookback window */
  timeRange: { from: string; to: string } | undefined;
  /** Whether the chart attributes are currently being built */
  isLoading: boolean;
  /** Whether the chart attributes failed to build */
  hasError: boolean;
}

export interface UsePreviewChartParams {
  /** The base ES|QL query (without condition) */
  query: string;
  /** The time field name for the date histogram */
  timeField: string;
  /** The lookback duration string (e.g. '5m', '1h') */
  lookback: string;
  /** ES|QL columns from the preview query result (used for STATS query suggestions) */
  esqlColumns?: PreviewColumn[];
  /** Whether the chart is enabled (defaults to true) */
  enabled?: boolean;
}

/**
 * Converts PreviewColumn[] (EuiDataGrid format) to DatatableColumn[]
 * (Expressions format) for use with LensVisService.
 *
 * ES types (e.g. 'keyword', 'long') must be mapped to Kibana
 * DatatableColumnType values (e.g. 'string', 'number') for Lens
 * suggestions to work correctly. This mirrors the conversion that
 * Discover performs via `formatESQLColumns`.
 */
const toDatatableColumns = (columns: PreviewColumn[]): DatatableColumn[] =>
  columns.map(
    (col) =>
      ({
        id: col.id,
        name: col.id,
        meta: { type: esFieldTypeToKibanaFieldType(col.esType), esType: col.esType },
      } as DatatableColumn)
  );

/**
 * Creates a stable string key from column definitions so that we can
 * detect meaningful changes without relying on object reference equality.
 */
const columnsToKey = (columns: PreviewColumn[]): string =>
  columns.map((c) => `${c.id}:${c.esType}`).join(',');

/**
 * Hook that builds Lens embeddable attributes for a preview chart using the
 * same `LensVisService` from `@kbn/unified-histogram` that Discover uses.
 *
 * For non-STATS queries, it builds a time histogram (count over time with
 * BUCKET). For STATS queries, it delegates to the Lens suggestions API to
 * pick an appropriate chart type from the aggregated columns.
 *
 * Uses the same debounce timing as `usePreview` to keep the chart and grid
 * visually in sync.
 */
export const usePreviewChart = ({
  query,
  timeField,
  lookback,
  esqlColumns = [],
  enabled = true,
}: UsePreviewChartParams): UsePreviewChartResult => {
  const { data, dataViews, lens } = useRuleFormServices();

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_WAIT);

  // Build a stable string key so the effect only re-runs when column
  // content actually changes, not on every parent render.
  const columnsKey = useMemo(() => columnsToKey(esqlColumns), [esqlColumns]);

  // Keep the converted DatatableColumn[] in a ref so the effect can
  // always read the latest value without depending on its reference.
  const datatableColumnsRef = useRef<DatatableColumn[]>([]);
  datatableColumnsRef.current = useMemo(() => toDatatableColumns(esqlColumns), [esqlColumns]);

  const timeRange = useMemo(() => {
    if (!lookback?.trim()) return undefined;
    try {
      const lookbackMs = parseDuration(lookback);
      const now = Date.now();
      return {
        from: new Date(now - lookbackMs).toISOString(),
        to: new Date(now).toISOString(),
      };
    } catch {
      return undefined;
    }
  }, [lookback]);

  // Keep timeRange in a ref for the same reason
  const timeRangeRef = useRef(timeRange);
  timeRangeRef.current = timeRange;

  const [lensAttributes, setLensAttributes] = useState<
    TypedLensByValueInput['attributes'] | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Cache the LensVisService instance across renders
  const lensVisServiceRef = useRef<LensVisService | null>(null);

  useEffect(() => {
    const hasValidInputs =
      enabled &&
      Boolean(debouncedQuery?.trim()) &&
      Boolean(timeField?.trim()) &&
      Boolean(lookback?.trim());

    if (!hasValidInputs) {
      setLensAttributes(undefined);
      setHasError(false);
      setIsLoading(false);
      return;
    }

    // Don't try to build chart if query has syntax errors
    if (validateEsqlQuery(debouncedQuery ?? '')) {
      setLensAttributes(undefined);
      setHasError(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const run = async () => {
      try {
        // Initialize or reuse LensVisService
        if (!lensVisServiceRef.current) {
          const apiHelper = await lens.stateHelperApi();
          lensVisServiceRef.current = new LensVisService({
            services: { data },
            lensSuggestionsApi: apiHelper.suggestions,
          });
        }

        if (cancelled) return;

        // Create an ad-hoc DataView from the query's index pattern.
        // We must NOT skip field fetching: the Lens suggestions API needs
        // the DataView's field list (via toSpec()) to generate valid suggestions.
        // We don't pass http, so time-field auto-detection is skipped —
        // we set the time field manually from the form below.
        const adHocDataView = await getESQLAdHocDataview({
          dataViewsService: dataViews,
          query: debouncedQuery!,
        });

        if (cancelled) return;

        // Set the time field to the user-configured value
        adHocDataView.timeFieldName = timeField;

        const queryParams: LensVisQueryParams = {
          dataView: adHocDataView,
          query: { esql: debouncedQuery! },
          filters: [],
          isPlainRecord: true,
          columns: datatableColumnsRef.current,
          timeRange: timeRangeRef.current,
        };

        const result = lensVisServiceRef.current.update({
          externalVisContext: undefined,
          queryParams,
          timeInterval: undefined,
          breakdownField: undefined,
          table: undefined,
        });

        if (!cancelled) {
          if (result.visContext?.attributes) {
            setLensAttributes(result.visContext.attributes);
            setHasError(false);
          } else {
            // No suggestion available (e.g. unsupported query)
            setLensAttributes(undefined);
            setHasError(false);
          }
          setIsLoading(false);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[usePreviewChart] Failed to build chart attributes:', err);
        if (!cancelled) {
          setLensAttributes(undefined);
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // columnsKey is a stable string derived from esqlColumns content.
    // timeRange and datatableColumns are read from refs to avoid
    // re-triggering the effect on every object reference change.
  }, [enabled, debouncedQuery, timeField, lookback, columnsKey, data, dataViews, lens]);

  // True while the debounce timer is pending
  const isDebouncing = query !== debouncedQuery;

  return {
    lensAttributes,
    timeRange,
    isLoading: isDebouncing || isLoading,
    hasError,
  };
};
