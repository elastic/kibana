/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer, EuiText } from '@elastic/eui';
import { DEFAULT_FACET_SIZE } from '../../../common/constants';
import { findIndexMetadata } from '../../../common/metadata';
import type { FieldInfo, Filter, FilterOperator, MetadataResponse } from '../../../common/types';
import { DocumentsTable } from '../components/documents_table';
import { ColumnPicker } from '../components/column_picker';
import { ErrorCallout } from '../components/error_callout';
import { EditInEsqlButton, EsqlQueryPanel } from '../components/esql_query_panel';
import { ExportButtons } from '../components/export_buttons';
import { FacetsPanel } from '../components/facets_panel';
import { FilterBar, describeFilter } from '../components/filter_bar';
import { HistogramChart } from '../components/histogram_chart';
import { PageLayout } from '../components/page_layout';
import type { IndexViewState } from '../lib/index_url_state';
import { parseIndexViewState, serializeIndexViewState } from '../lib/index_url_state';
import { decodeParam, indexPath } from '../lib/paths';
import { useServices } from '../services';
import { i18nTexts } from '../translations';

const METADATA_FIELDS: readonly FieldInfo[] = [
  { name: '_id', type: 'keyword' },
  { name: '_index', type: 'keyword' },
];
const RANGE_OPERATORS: readonly FilterOperator[] = ['gt', 'gte', 'lt', 'lte'];

function sameFilter(left: Filter, right: Filter): boolean {
  return (
    left.field === right.field && left.operator === right.operator && left.value === right.value
  );
}

/** Table view of an index, data stream or alias with filters, facets and export. */
export function IndexPage({ metadata }: { metadata: MetadataResponse }) {
  const { api, history } = useServices();
  const params = useParams<{ index: string }>();
  const index = decodeParam(params.index);
  const { search: locationSearch } = useLocation();
  const state = useMemo(() => parseIndexViewState(locationSearch), [locationSearch]);

  const indexMetadata = findIndexMetadata(index, metadata.indices);
  const pinnedFacets = useMemo(() => indexMetadata?.facets ?? [], [indexMetadata]);
  const facets = useMemo(
    () => [...new Set([...pinnedFacets, ...state.facets])],
    [pinnedFacets, state.facets]
  );

  const fieldsResult = useAsync(() => api.getFields(index), [api, index]);
  const searchResult = useAsync(
    () =>
      api.search(index, {
        filters: state.filters,
        search: state.search || undefined,
        sort: state.sort,
        columns: state.columns,
        hiddenColumns: state.hiddenColumns,
        from: state.page * state.size,
        size: state.size,
        facets,
        facetSize: DEFAULT_FACET_SIZE,
        suggestFacets: true,
      }),
    [api, index, state, facets]
  );

  const histogramResult = useAsync(
    () => api.getHistogram(index, { filters: state.filters, search: state.search || undefined }),
    [api, index, state.filters, state.search]
  );

  function pathFor(next: Partial<IndexViewState>): string {
    return indexPath(index, serializeIndexViewState({ ...state, page: 0, ...next }));
  }

  function navigate(next: Partial<IndexViewState>) {
    history.push(pathFor(next));
  }

  function hasFilter(filter: Filter): boolean {
    return state.filters.some((existing) => sameFilter(existing, filter));
  }

  function withoutFilter(filter: Filter): Filter[] {
    return state.filters.filter((existing) => !sameFilter(existing, filter));
  }

  function addFilter(filter: Filter) {
    if (!hasFilter(filter)) {
      navigate({ filters: [...state.filters, filter] });
    }
  }

  function filterToRange(field: string, from: number, to: number) {
    const outsideRange = state.filters.filter(
      (filter) => filter.field !== field || !RANGE_OPERATORS.includes(filter.operator)
    );
    navigate({
      filters: [
        ...outsideRange,
        { field, operator: 'gte', value: new Date(from).toISOString() },
        { field, operator: 'lt', value: new Date(to).toISOString() },
      ],
    });
  }

  function replaceFilter(previous: Filter, next: Filter) {
    const replaced = state.filters.map((existing) =>
      sameFilter(existing, previous) ? next : existing
    );
    navigate({
      filters: replaced.filter(
        (filter, position) => replaced.findIndex((other) => sameFilter(other, filter)) === position
      ),
    });
  }

  function shownColumns(): string[] {
    if (state.columns.length > 0) {
      return state.columns;
    }
    return searchResult.value?.columns.map(({ name }) => name) ?? [];
  }

  function toggleColumn(name: string) {
    const current = shownColumns();
    const columns = current.includes(name)
      ? current.filter((column) => column !== name)
      : [...current, name];
    if (columns.length > 0) {
      navigate({ columns, hiddenColumns: [] });
    }
  }

  function toggleValuePath(field: string, value: string): string {
    const filter: Filter = { field, operator: 'exact', value };
    return pathFor({
      filters: hasFilter(filter) ? withoutFilter(filter) : [...state.filters, filter],
    });
  }

  const title = indexMetadata?.title ?? index;
  const result = searchResult.value;
  const histogram = histogramResult.value;
  const timeField = histogram?.field;
  const fields = fieldsResult.value?.fields ?? [];

  return (
    <PageLayout
      title={title}
      documentTitle={index}
      description={indexMetadata?.description}
      breadcrumbs={[{ text: index }]}
      rightSideItems={result ? [<EditInEsqlButton esql={result.esql} key="esql" />] : []}
    >
      <FilterBar
        index={index}
        fields={fields}
        filters={state.filters}
        search={state.search}
        onSearchChange={(search) => navigate({ search })}
        onAddFilter={addFilter}
        onReplaceFilter={replaceFilter}
        onRemoveFilter={(filter) => navigate({ filters: withoutFilter(filter) })}
      />
      <EuiSpacer size="m" />
      {searchResult.error ? (
        <ErrorCallout title={i18nTexts.searchError} error={searchResult.error} />
      ) : (
        <>
          {histogram && timeField && histogram.buckets.length > 0 ? (
            <>
              <HistogramChart
                histogram={histogram}
                onBrush={(from, to) => filterToRange(timeField, from, to)}
              />
              <EuiSpacer size="m" />
            </>
          ) : null}
          <FacetsPanel
            fields={fields}
            facets={result?.facets ?? []}
            suggestedFacets={result?.suggestedFacets ?? []}
            pinnedFacets={pinnedFacets}
            isValueSelected={(field, value) => hasFilter({ field, operator: 'exact', value })}
            addFacetPath={(field) => pathFor({ facets: [...state.facets, field] })}
            removeFacetPath={(field) =>
              pathFor({ facets: state.facets.filter((facet) => facet !== field) })
            }
            toggleValuePath={toggleValuePath}
          />
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="s" data-test-subj="indexExplorerResultSummary">
                {result
                  ? i18nTexts.documentCount(
                      result.total,
                      state.filters.map(describeFilter).join(', '),
                      state.search
                    )
                  : i18nTexts.loading}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ColumnPicker
                fields={[...METADATA_FIELDS, ...fields]}
                isVisible={(name) => shownColumns().includes(name)}
                onToggle={toggleColumn}
                onReset={() => navigate({ columns: [], hiddenColumns: [] })}
                isCustomized={state.columns.length > 0 || state.hiddenColumns.length > 0}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ExportButtons
                disabled={!result || result.total === 0}
                onExport={(format) =>
                  api.exportIndex(index, {
                    filters: state.filters,
                    search: state.search || undefined,
                    sort: state.sort,
                    columns: shownColumns(),
                    hiddenColumns: [],
                    format,
                  })
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          {result ? (
            <>
              <EuiSpacer size="s" />
              <EsqlQueryPanel id="indexExplorerIndexEsql" esql={result.esql} />
            </>
          ) : null}
          <EuiSpacer size="s" />
          <DocumentsTable
            index={index}
            columns={result?.columns ?? []}
            rows={result?.rows ?? []}
            total={result?.total ?? 0}
            page={state.page}
            size={state.size}
            sort={result?.sort ?? state.sort}
            loading={searchResult.loading}
            onChange={({ page, size, sort }) =>
              history.push(
                indexPath(index, serializeIndexViewState({ ...state, page, size, sort }))
              )
            }
          />
        </>
      )}
    </PageLayout>
  );
}
