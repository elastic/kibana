/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart } from '@elastic/eui';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { getLensAttributesFromSuggestion, ChartType } from '@kbn/visualization-utils';
import { useRuleFormServices } from '../../form/contexts/rule_form_context';
import type { QueryColumn } from './use_query_execution';

const CHART_HEIGHT = 180;

interface ComposeDiscoverChartProps {
  query: string;
  timeField: string;
  timeRange: { from: string; to: string };
  columns: QueryColumn[];
}

const toDatatableColumns = (columns: QueryColumn[]): DatatableColumn[] =>
  columns.map(
    (col) =>
      ({
        id: col.id,
        name: col.id,
        meta: { type: esFieldTypeToKibanaFieldType(col.esType), esType: col.esType },
      } as DatatableColumn)
  );

export const ComposeDiscoverChart: React.FC<ComposeDiscoverChartProps> = ({
  query,
  timeField,
  timeRange,
  columns,
}) => {
  const { lens, dataViews } = useRuleFormServices();
  const [lensAttributes, setLensAttributes] = useState<
    TypedLensByValueInput['attributes'] | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const datatableColumnsRef = useRef<DatatableColumn[]>([]);
  datatableColumnsRef.current = useMemo(() => toDatatableColumns(columns), [columns]);

  useEffect(() => {
    if (!query.trim() || !timeField.trim() || columns.length === 0) {
      setLensAttributes(undefined);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const run = async () => {
      try {
        const { suggestions } = await lens.stateHelperApi();
        if (cancelled) return;

        const adHocDataView = await getESQLAdHocDataview({
          dataViewsService: dataViews,
          query,
        });
        if (cancelled) return;

        adHocDataView.timeFieldName = timeField;

        const context = {
          dataViewSpec: adHocDataView.toSpec(),
          fieldName: '',
          textBasedColumns: datatableColumnsRef.current,
          query: { esql: query },
        };

        const allSuggestions =
          suggestions(context, adHocDataView, ['lnsDatatable'], ChartType.Bar) ?? [];

        const chartSuggestions = allSuggestions.filter(
          (s) => s.visualizationId && s.visualizationId !== 'lnsDatatable'
        );

        if (!cancelled) {
          if (chartSuggestions[0]) {
            const attrs = getLensAttributesFromSuggestion({
              filters: [],
              query: { esql: query },
              suggestion: chartSuggestions[0],
              dataView: adHocDataView,
            });
            setLensAttributes(attrs as TypedLensByValueInput['attributes']);
          } else {
            setLensAttributes(undefined);
          }
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLensAttributes(undefined);
          setIsLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [query, timeField, columns, lens, dataViews]);

  if (isLoading && !lensAttributes) {
    return (
      <EuiFlexGroup style={{ height: CHART_HEIGHT }} justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingChart size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!lensAttributes) return null;

  const LensComponent = lens.EmbeddableComponent;

  return (
    <div style={{ height: CHART_HEIGHT, width: '100%' }}>
      <LensComponent
        id="composeDiscoverChart"
        viewMode="view"
        timeRange={timeRange}
        attributes={lensAttributes}
        noPadding
        disableTriggers
      />
    </div>
  );
};
