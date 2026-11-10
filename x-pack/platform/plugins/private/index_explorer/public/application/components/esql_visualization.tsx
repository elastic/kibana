/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  appendToESQLQuery,
  formatESQLColumns,
  getESQLAdHocDataview,
  hasTransformationalCommand,
  removeDropCommandsFromESQLQuery,
} from '@kbn/esql-utils';
import type { LensPublicStart, Suggestion, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { ChartType, getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import { inlineEsqlParams } from '../../../common/esql_params';
import { pickInterval } from '../../../common/histogram_interval';
import type { EsqlColumn, EsqlRequestBody } from '../../../common/types';
import type { IndexExplorerApi } from '../api';
import { useServices } from '../services';
import { i18nTexts } from '../translations';

type LensAttributes = TypedLensByValueInput['attributes'];
type EditPanelProps = ComponentProps<
  Awaited<ReturnType<LensPublicStart['EditLensConfigPanelApi']>>
>;
type LensAdapters = EditPanelProps['lensAdapters'];

const CHART_HEIGHT = 300;
const EDITOR_HEIGHT = 640;
const EDITOR_WIDTH = 400;
const DATA_VIEW_ID_PREFIX = 'indexExplorer';
const PREFERRED_TIME_COLUMN = '@timestamp';
const DATE_TYPES = new Set(['date', 'date_nanos']);
const BUCKET_COLUMN = 'timestamp';
const COUNT_COLUMN = 'results';

interface ChartSource {
  readonly query: string;
  readonly columns: EsqlColumn[];
  /** Set when charting document counts over time because the query does not aggregate. */
  readonly histogram?: { readonly field: string; readonly interval: string };
}

function quoteIdentifier(name: string): string {
  return `\`${name.replace(/`/g, '``')}\``;
}

function findTimeColumn(columns: readonly EsqlColumn[]): string | undefined {
  const dates = columns.filter(({ type }) => DATE_TYPES.has(type));
  return (dates.find(({ name }) => name === PREFERRED_TIME_COLUMN) ?? dates[0])?.name;
}

function toMillis(value: unknown): number | undefined {
  const millis = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isNaN(millis) ? undefined : millis;
}

/**
 * Aggregated results are charted as they are. Row results are charted like Discover does,
 * as a count of the same rows over their time column.
 */
async function toChartSource(
  api: IndexExplorerApi,
  query: string,
  columns: readonly EsqlColumn[]
): Promise<ChartSource> {
  const field = hasTransformationalCommand(query) ? undefined : findTimeColumn(columns);
  if (!field) {
    return { query, columns: [...columns] };
  }
  const base = removeDropCommandsFromESQLQuery(query);
  const column = quoteIdentifier(field);
  const range = await api.runEsql({
    query: appendToESQLQuery(base, `| STATS __min = MIN(${column}), __max = MAX(${column})`),
    params: [],
  });
  const [[minValue, maxValue] = []] = range.values;
  const min = toMillis(minValue);
  const max = toMillis(maxValue);
  if (min === undefined || max === undefined) {
    return { query, columns: [...columns] };
  }
  const { literal } = pickInterval(max - min);
  return {
    query: appendToESQLQuery(
      base,
      `| STATS ${COUNT_COLUMN} = COUNT(*) BY ${BUCKET_COLUMN} = BUCKET(${column}, ${literal})\n| SORT ${BUCKET_COLUMN} ASC`
    ),
    columns: [
      { name: BUCKET_COLUMN, type: 'date' },
      { name: COUNT_COLUMN, type: 'long' },
    ],
    histogram: { field, interval: literal },
  };
}

function isStateObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function fromAttributes(suggestion: Suggestion, attributes: LensAttributes): Suggestion {
  const { textBased: datasourceState } = attributes.state.datasourceStates;
  return {
    ...suggestion,
    title: attributes.title,
    visualizationId: attributes.visualizationType ?? suggestion.visualizationId,
    visualizationState: attributes.state.visualization,
    ...(isStateObject(datasourceState) && { datasourceState }),
  };
}

interface EsqlVisualizationProps {
  readonly request: EsqlRequestBody;
  readonly columns: readonly EsqlColumn[];
}

/** Lens chart of an ES|QL query's results, editable in place with the Lens config panel. */
export function EsqlVisualization({ request, columns }: EsqlVisualizationProps) {
  const { api, core, dataViews, lens } = useServices();
  const query = useMemo(() => inlineEsqlParams(request.query, request.params), [request]);

  // The last chart shown, so re-running a query keeps the chosen chart type.
  const preferred = useRef<{ attributes: LensAttributes; isHistogram: boolean } | undefined>(
    undefined
  );
  const lensAdapters = useRef<LensAdapters>(undefined);

  const initial = useAsync(async () => {
    const source = await toChartSource(api, query, columns);
    const [{ suggestions }, dataView] = await Promise.all([
      lens.stateHelperApi(),
      getESQLAdHocDataview({
        dataViewsService: dataViews,
        query: source.query,
        http: core.http,
        options: { skipFetchFields: true, idPrefix: DATA_VIEW_ID_PREFIX },
      }),
    ]);
    // Results are not limited to the global time range, so the chart must not be either.
    dataView.timeFieldName = undefined;
    const context = {
      dataViewSpec: dataView.toSpec(),
      fieldName: '',
      textBasedColumns: formatESQLColumns(source.columns),
      query: { esql: source.query },
    };
    const isHistogram = Boolean(source.histogram);
    const preferredAttributes =
      preferred.current?.isHistogram === isHistogram ? preferred.current.attributes : undefined;
    const [suggestion] =
      suggestions(
        context,
        dataView,
        ['lnsDatatable'],
        isHistogram ? ChartType.XY : undefined,
        preferredAttributes
      ) ?? [];
    return { dataView, suggestion, source };
  }, [api, core.http, dataViews, lens, query, columns]);

  const [suggestion, setSuggestion] = useState<Suggestion | undefined>(undefined);
  const [editor, setEditor] = useState<JSX.Element | null>(null);

  useEffect(() => {
    setSuggestion(initial.value?.suggestion);
    setEditor(null);
  }, [initial.value]);

  const dataView = initial.value?.dataView;
  const source = initial.value?.source;
  const attributes = useMemo<LensAttributes | undefined>(() => {
    if (!suggestion || !dataView || !source) {
      return undefined;
    }
    // The helper returns the same shape as Lens attributes, with less specific state types.
    return getLensAttributesFromSuggestion({
      filters: [],
      query: { esql: source.query },
      suggestion,
      dataView,
    }) as LensAttributes;
  }, [suggestion, dataView, source]);

  useEffect(() => {
    if (attributes && source) {
      preferred.current = { attributes, isHistogram: Boolean(source.histogram) };
    }
  }, [attributes, source]);

  async function openEditor() {
    if (!attributes || !suggestion) {
      return;
    }
    const original = suggestion;
    const EditPanel = await lens.EditLensConfigPanelApi();

    function close() {
      setEditor(null);
    }

    // Created once per editing session: re-rendering it would reset the editor's own state.
    setEditor(
      <EditPanel
        attributes={attributes}
        lensAdapters={lensAdapters.current}
        hideTextBasedEditor
        updatePanelState={(datasourceState, visualizationState, visualizationId) => {
          setSuggestion((current) =>
            current
              ? {
                  ...current,
                  visualizationId: visualizationId ?? current.visualizationId,
                  ...(isStateObject(datasourceState) && { datasourceState }),
                  ...(isStateObject(visualizationState) && { visualizationState }),
                }
              : current
          );
        }}
        updateSuggestion={(nextAttributes) => {
          setSuggestion((current) => (current ? fromAttributes(current, nextAttributes) : current));
        }}
        onApply={(nextAttributes) => {
          setSuggestion((current) => (current ? fromAttributes(current, nextAttributes) : current));
          close();
        }}
        onCancel={() => {
          setSuggestion(original);
          close();
        }}
        closeFlyout={close}
        applyButtonLabel={i18nTexts.applyVisualization}
      />
    );
  }

  let chart: JSX.Element;
  if (initial.loading) {
    chart = (
      <EuiFlexGroup css={{ height: CHART_HEIGHT }} justifyContent="center" alignItems="center">
        <EuiLoadingChart size="l" />
      </EuiFlexGroup>
    );
  } else if (!attributes) {
    chart = (
      <EuiText size="s" color="subdued" data-test-subj="indexExplorerNoVisualization">
        {initial.error ? initial.error.message : i18nTexts.noVisualization}
      </EuiText>
    );
  } else {
    chart = (
      <lens.EmbeddableComponent
        id="indexExplorerEsqlVisualization"
        attributes={attributes}
        viewMode="view"
        noPadding
        disableTriggers
        style={{ height: CHART_HEIGHT }}
        onLoad={(_isLoading, adapters) => {
          lensAdapters.current = adapters;
        }}
      />
    );
  }

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="indexExplorerEsqlVisualization">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>{i18nTexts.visualizationTitle}</h3>
          </EuiTitle>
          {source?.histogram ? (
            <EuiText size="xs" color="subdued" data-test-subj="indexExplorerVisualizationHistogram">
              {i18nTexts.visualizationHistogram(source.histogram.field, source.histogram.interval)}
            </EuiText>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {editor ? (
            <EuiButtonEmpty
              size="s"
              iconType="cross"
              onClick={() => setEditor(null)}
              data-test-subj="indexExplorerCloseVisualizationEditor"
            >
              {i18nTexts.closeVisualizationEditor}
            </EuiButtonEmpty>
          ) : (
            <EuiButton
              size="s"
              iconType="pencil"
              isDisabled={!attributes}
              onClick={openEditor}
              data-test-subj="indexExplorerEditVisualization"
            >
              {i18nTexts.editVisualization}
            </EuiButton>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
        <EuiFlexItem css={{ minWidth: 0 }}>{chart}</EuiFlexItem>
        {editor ? (
          <EuiFlexItem grow={false} css={{ width: EDITOR_WIDTH }}>
            <EuiPanel
              hasBorder
              paddingSize="none"
              css={{
                height: EDITOR_HEIGHT,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              data-test-subj="indexExplorerVisualizationEditor"
            >
              {editor}
            </EuiPanel>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
