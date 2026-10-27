/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiBasicTable,
  EuiText,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiSkeletonRectangle,
  EuiSkeletonText,
} from '@elastic/eui';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import moment from 'moment-timezone';

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePageUrlState } from '@kbn/ml-url-state';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';

import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import dateMath from '@kbn/datemath';
import {
  buildCustomFilter,
  buildEmptyFilter,
  buildEsQuery,
  FilterStateStore,
  isOfAggregateQueryType,
  isOfQueryType,
} from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-service';
import { QUERY_MODE, type QueryMode } from '@kbn/aiops-log-pattern-analysis/get_category_query';

import type { ReverseCategorizeOpenInNewTab } from '@kbn/ml-ui-actions';
import { createFilter } from '../use_discover_links';
import {
  type LogCategorizationPageUrlState,
  getDefaultLogCategorizationAppState,
} from '../../../application/url_state/log_pattern_analysis';
import { useData } from '../../../hooks/use_data';
import { useSearch } from '../../../hooks/use_search';
import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';

import { useCategorizeRequest } from '../use_categorize_request';
import type { EventRate } from '../use_categorize_request';
import { SamplingMenu, useRandomSamplerStorage } from '../sampling_menu';
import { useActions } from '../category_table/use_actions';
import { MiniHistogram } from '../../mini_histogram';
import { useDocsForCategory } from './use_docs_for_category';
import { useCreateFormattedExample } from '../format_category';
import { PatternCellRenderer } from './pattern_cell_renderer';
import {
  MAX_SPARKLINE_BUCKETS,
  addWhereToEsqlQuery,
  buildMatchFilterExpression,
  findCategoryMatchingFieldValue,
  getEsqlDocumentScopeQuery,
} from './build_esql_analysis_queries';
import { runEsqlCategorizeRequest } from './run_esql_categorize_request';

type SparkLinesPerCategory = Record<string, Record<number, number>>;

export interface ReverseCategorizationSearchScope {
  query?: Query | AggregateQuery;
  filters?: Filter[];
  /** An additional KQL/Lucene query applied on top of `query`, e.g. a dashboard's query. */
  filterQuery?: Query;
  /** The time range of the panel or tab, when it differs from the global time range. */
  timeRange?: TimeRange;
}

export interface ReverseCategorizationPageProps {
  dataView: DataView;
  savedSearch: SavedSearch | null;
  selectedField: DataViewField;
  fieldValue: string;
  /** Opens a query, with optional filters, in a new tab of the originating app (e.g. Discover). */
  openInNewTab?: ReverseCategorizeOpenInNewTab;
  /**
   * The search scope of the panel or tab the flyout was opened from. Used instead of the global
   * query state when it has a `query`.
   */
  searchScope?: ReverseCategorizationSearchScope;
  onClose: () => void;
}

const BAR_TARGET = 60;
// Keep the histogram within what SPARKLINE accepts. Aligning the range to the interval can add
// one extra bucket to the count, so leave room for it.
const MAX_HISTOGRAM_BARS = MAX_SPARKLINE_BUCKETS - 2;

const isEmptyBoolQuery = ({ bool }: ReturnType<typeof buildEsQuery>): boolean =>
  bool !== undefined &&
  [bool.filter, bool.must, bool.must_not, bool.should].every((clauses) =>
    Array.isArray(clauses) ? clauses.length === 0 : clauses === undefined
  );

export const ReverseCategorizationFlyout: FC<ReverseCategorizationPageProps> = ({
  dataView,
  savedSearch,
  selectedField,
  fieldValue,
  openInNewTab,
  searchScope,
  onClose,
}) => {
  const {
    notifications: { toasts },
    data: {
      query: { getState, filterManager },
      search,
    },
    uiSettings,
  } = useAiopsAppContext();

  // Use the query and filters of the panel or tab the flyout was opened from. The global
  // query state is not the right source there, e.g. in a dashboard.
  const {
    filters: scopeFilters,
    query,
    filterQuery,
  } = useMemo(() => {
    if (searchScope?.query !== undefined) {
      return {
        query: searchScope.query,
        filters: searchScope.filters ?? [],
        filterQuery: searchScope.filterQuery,
      };
    }
    return { ...getState(), filterQuery: undefined };
  }, [getState, searchScope]);
  const isEsqlQuery = isOfAggregateQueryType(query);

  // Express the additional query as a filter so it is applied to the analysis and carried
  // into links alongside the other filters.
  const filters = useMemo(() => {
    if (filterQuery === undefined) {
      return scopeFilters ?? [];
    }
    const filterQueryDsl = buildEsQuery(
      dataView,
      filterQuery,
      [],
      uiSettings ? getEsQueryConfig(uiSettings) : undefined
    );
    // An empty query, e.g. an empty dashboard query bar, builds a DSL with no clauses.
    // Don't add a filter that has no effect.
    if (isEmptyBoolQuery(filterQueryDsl)) {
      return scopeFilters ?? [];
    }
    return [
      ...(scopeFilters ?? []),
      buildCustomFilter(
        dataView.id ?? '',
        filterQueryDsl,
        false,
        false,
        null,
        FilterStateStore.APP_STATE
      ),
    ];
  }, [dataView, filterQuery, scopeFilters, uiSettings]);

  const panelTimeRange = useMemo(() => {
    const timeRange = searchScope?.timeRange;
    const min = timeRange ? dateMath.parse(timeRange.from) : undefined;
    const max = timeRange ? dateMath.parse(timeRange.to, { roundUp: true }) : undefined;
    return min && max ? { min, max } : undefined;
  }, [searchScope?.timeRange]);
  const [matchNotFound, setMatchNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const mounted = useRef(false);
  const esqlAbortController = useRef(new AbortController());
  const randomSamplerStorage = useRandomSamplerStorage();
  const {
    runCategorizeRequest,
    cancelRequest: cancelCategorizationRequest,
    randomSampler,
  } = useCategorizeRequest(randomSamplerStorage);
  // buildEsQuery drops AggregateQuery/ES|QL; for ES|QL keep only filter-bar DSL and
  // drive categorization/docs from the active ES|QL query instead.
  const [stateFromUrl] = usePageUrlState<LogCategorizationPageUrlState>(
    'logCategorization',
    getDefaultLogCategorizationAppState({
      filters,
      ...(isOfQueryType(query)
        ? {
            searchString: query.query,
            searchQueryLanguage: query.language === 'lucene' ? 'lucene' : 'kuery',
          }
        : {}),
      searchQuery: buildEsQuery(
        dataView,
        isEsqlQuery ? [] : query ?? [],
        filters,
        uiSettings ? getEsQueryConfig(uiSettings) : undefined
      ),
    })
  );
  const createFormattedExample = useCreateFormattedExample();
  const [loading, setLoading] = useState(true);
  const [eventRate, setEventRate] = useState<EventRate>([]);

  const [data, setData] = useState<{
    selectedCategory: Category | null;
    categories: Category[];
    sparkLines: SparkLinesPerCategory;
    docs: { timestamp: string; message: string }[];
    docCount: number;
  } | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const cancelRequest = useCallback(() => {
    cancelCategorizationRequest();
    esqlAbortController.current.abort();
    esqlAbortController.current = new AbortController();
  }, [cancelCategorizationRequest]);

  useEffect(
    function cancelRequestOnLeave() {
      mounted.current = true;
      return () => {
        mounted.current = false;
        cancelRequest();
      };
    },
    [cancelRequest, mounted]
  );

  const { searchQueryLanguage, searchString, searchQuery } = useSearch(
    { dataView, savedSearch },
    stateFromUrl,
    true
  );

  const { docsForCategory } = useDocsForCategory();

  const esqlDocumentScope = useMemo(
    () => (isOfAggregateQueryType(query) ? getEsqlDocumentScopeQuery(query.esql) : undefined),
    [query]
  );

  const { documentStats, timefilter, earliest, latest, intervalMs, forceRefresh } = useData(
    dataView,
    'log_categorization',
    searchQuery,
    undefined,
    undefined,
    undefined,
    BAR_TARGET,
    undefined,
    panelTimeRange,
    undefined,
    esqlDocumentScope,
    MAX_HISTOGRAM_BARS
  );

  const onAddFilter = useCallback(
    (values: Filter, alias?: string) => {
      const filter = buildEmptyFilter(false, dataView.id);
      if (alias) {
        filter.meta.alias = alias;
      }
      filter.query = values.query;
      filterManager.addFilters([filter]);
    },
    [dataView.id, filterManager]
  );

  // Links open Discover with the time range that was analysed.
  const analysisTimeRange = useMemo(
    () =>
      earliest !== undefined && latest !== undefined ? { from: earliest, to: latest } : undefined,
    [earliest, latest]
  );

  const { openInDiscover } = useActions(
    dataView.id!,
    selectedField,
    selectedCategory ? [selectedCategory] : [],
    stateFromUrl,
    timefilter,
    onAddFilter,
    analysisTimeRange,
    onClose,
    query
  );

  const openCategoryInDiscover = useCallback(
    (mode: QueryMode) => {
      if (selectedCategory === null || earliest === undefined || latest === undefined) {
        return;
      }

      const tabLabel = i18n.translate(
        'xpack.aiops.logCategorization.reverseCategorization.tabLabel',
        {
          defaultMessage: 'Pattern: {field}',
          values: { field: selectedField.displayName || selectedField.name },
        }
      );
      const timeRange = {
        from: new Date(earliest).toISOString(),
        to: new Date(latest).toISOString(),
      };

      if (openInNewTab === undefined) {
        // No new tab support from the originating app: open Discover in a browser tab.
        openInDiscover.openFunction(mode, true);
        onClose();
        return;
      }

      // Leave the current tab untouched and continue the analysis in a new one.
      if (isOfAggregateQueryType(query)) {
        openInNewTab({
          query: {
            esql: addWhereToEsqlQuery(
              query.esql,
              buildMatchFilterExpression(selectedField.name, selectedCategory.key, mode)
            ),
          },
          timeRange,
          tabLabel,
        });
      } else {
        openInNewTab({
          query: { language: stateFromUrl.searchQueryLanguage, query: stateFromUrl.searchString },
          filters: [
            ...stateFromUrl.filters,
            createFilter(
              dataView.id ?? '',
              selectedField.name,
              [selectedCategory],
              mode,
              selectedCategory
            ),
          ],
          dataViewId: dataView.id,
          timeRange,
          tabLabel,
        });
      }
      onClose();
    },
    [
      dataView.id,
      earliest,
      latest,
      onClose,
      openInDiscover,
      openInNewTab,
      query,
      selectedCategory,
      selectedField,
      stateFromUrl,
    ]
  );

  const loadCategories = useCallback(async () => {
    const { getIndexPattern, timeFieldName: timeField } = dataView;
    const index = getIndexPattern();

    if (
      selectedField === undefined ||
      timeField === undefined ||
      earliest === undefined ||
      latest === undefined ||
      intervalMs === undefined
    ) {
      return;
    }

    cancelRequest();

    setLoading(true);
    setData(null);
    setMatchNotFound(false);
    setErrorMessage(undefined);

    const timeRange = {
      from: earliest,
      to: latest,
    };
    // Use the same bounds as the histogram so ?_tstart / ?_tend match earliest / latest.
    const esTimeRange = {
      from: new Date(earliest).toISOString(),
      to: new Date(latest).toISOString(),
    };
    const timeFilter = {
      bool: {
        filter: [
          {
            range: {
              [timeField]: {
                gte: earliest,
                lte: latest,
                format: 'epoch_millis',
              },
            },
          },
          // The filters and additional query of the originating panel or tab.
          searchQuery,
        ],
      },
    };

    const runtimeMappings = dataView.getRuntimeMappings();
    const abortSignal = esqlAbortController.current.signal;

    try {
      const categorizationResult =
        isEsqlQuery && isOfAggregateQueryType(query)
          ? await runEsqlCategorizeRequest({
              esql: query.esql,
              fieldName: selectedField.name,
              timeFieldName: timeField,
              earliest,
              latest,
              intervalMs,
              search: search.search,
              timeRange: esTimeRange,
              filter: timeFilter,
              signal: abortSignal,
            })
          : await runCategorizeRequest(
              index,
              selectedField.name,
              timeField,
              timeRange,
              searchQuery,
              runtimeMappings,
              undefined,
              intervalMs,
              undefined
            );

      if (mounted.current === true) {
        let docs: { timestamp: string; message: string }[] = [];

        if (fieldValue) {
          const category = findCategoryMatchingFieldValue(
            categorizationResult.categories,
            fieldValue
          );
          if (!category) {
            setMatchNotFound(true);
            return;
          }

          setSelectedCategory(category);

          // Fetch documents for the matching category within the same analysis scope
          const { results, total } = await docsForCategory({
            index,
            field: selectedField.name,
            category,
            mode: 'should',
            additionalFilters: filters,
            timeField,
            size: 1000,
            query: isEsqlQuery ? query : undefined,
            timeRange: esTimeRange,
            filter: isEsqlQuery ? timeFilter : undefined,
            signal: abortSignal,
          });
          docs = results;

          setLoading(false);

          setData({
            selectedCategory: category,
            categories: categorizationResult.categories,
            sparkLines: categorizationResult.categories.reduce((acc, cat) => {
              acc[cat.key] = cat.sparkline!;
              return acc;
            }, {} as SparkLinesPerCategory),
            docs,
            docCount: total,
          });
        }
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      toasts.addError(error, {
        title: i18n.translate('xpack.aiops.logCategorization.errorLoadingCategories', {
          defaultMessage: 'Error loading categories',
        }),
      });
      if (mounted.current === true) {
        setErrorMessage(extractErrorMessage(error));
      }
    }

    if (mounted.current === true) {
      setLoading(false);
    }
  }, [
    dataView,
    selectedField,
    earliest,
    latest,
    cancelRequest,
    runCategorizeRequest,
    searchQuery,
    intervalMs,
    fieldValue,
    docsForCategory,
    filters,
    toasts,
    isEsqlQuery,
    query,
    search.search,
  ]);

  useEffect(() => {
    if (documentStats.errorMessage !== undefined) {
      // Loading the document counts failed, so categories will never load.
      setErrorMessage(documentStats.errorMessage);
      setLoading(false);
      return;
    }

    if (documentStats.documentCountStats?.buckets) {
      randomSampler.setDocCount(documentStats.totalCount);
      setEventRate(
        Object.entries(documentStats.documentCountStats.buckets).map(([key, docCount]) => ({
          key: +key,
          docCount,
        }))
      );
      setData(null);
      loadCategories();
    }
  }, [
    documentStats,
    earliest,
    latest,
    searchQueryLanguage,
    searchString,
    searchQuery,
    loadCategories,
    randomSampler,
  ]);

  const docsTableColumns = useMemo(() => {
    const dateFormat = uiSettings.get('dateFormat');

    const { timeFieldName: timeField } = dataView;
    const columns: Array<EuiBasicTableColumn<{ timestamp: string; message: string }>> = [
      {
        field: 'message',
        name: selectedField.displayName || selectedField.name,
        sortable: false,
        truncateText: false,
        render: (value: string) => {
          const key = data?.selectedCategory ? data.selectedCategory.key : '';
          const formattedValue = createFormattedExample(key, value);
          return (
            <EuiText css={{ fontWeight: 'bold' }} size="s">
              <code>{formattedValue ?? '-'}</code>
            </EuiText>
          );
        },
      },
    ];

    if (timeField) {
      columns.unshift({
        field: 'timestamp',
        name: timeField,
        truncateText: false,
        sortable: false,
        width: '200px',
        render: (value: string) => {
          return <code>{moment(value).format(dateFormat) ?? '-'}</code>;
        },
      });
    }

    return columns;
  }, [
    createFormattedExample,
    data,
    dataView,
    selectedField.displayName,
    selectedField.name,
    uiSettings,
  ]);

  const docsPagination = useMemo(() => {
    const docs = data?.docs ?? [];
    const pageStart = pageIndex * pageSize;
    return {
      pageOfItems: docs.slice(pageStart, pageStart + pageSize),
      pagination: {
        pageIndex,
        pageSize,
        totalItemCount: docs.length,
        pageSizeOptions: [10, 20, 50, 100],
      },
    };
  }, [data?.docs, pageIndex, pageSize]);

  const onTableChange = useCallback((criteria: any) => {
    if (criteria.page) {
      const { index, size } = criteria.page;
      setPageIndex(index);
      setPageSize(size);
    }
  }, []);

  const histogram = eventRate.map(({ key: catKey, docCount }) => {
    const term =
      (selectedCategory?.key && data ? data.sparkLines[selectedCategory?.key][catKey] : 0) ?? 0;
    const newTerm = term > docCount ? docCount : term;
    const adjustedDocCount = docCount - newTerm;

    return {
      doc_count_overall: adjustedDocCount,
      doc_count_significant_item: newTerm,
      key: catKey,
      key_as_string: `${catKey}`,
    };
  });

  return (
    <>
      <Header
        fieldName={selectedField.name}
        randomSampler={isEsqlQuery ? undefined : randomSampler}
        reload={() => forceRefresh()}
      />
      <EuiFlyoutBody data-test-subj="mlJobSelectorFlyoutBody">
        <EuiText css={{ fontWeight: 'bold' }}>{selectedField.displayName}</EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s">
          {data?.selectedCategory ? (
            <EuiText css={{ fontWeight: 'bold' }} size="s">
              <code>{createFormattedExample(data.selectedCategory.key, fieldValue)}</code>
            </EuiText>
          ) : (
            <code>{fieldValue}</code>
          )}
        </EuiText>

        <EuiSpacer size="l" />

        {errorMessage !== undefined ? (
          <KbnDangerCallout
            title={i18n.translate(
              'xpack.aiops.logCategorization.reverseCategorization.errorLoadingTitle',
              { defaultMessage: 'Error loading pattern analysis' }
            )}
            announceOnMount
            text={errorMessage}
            data-test-subj="aiopsReverseCategorizationError"
          />
        ) : matchNotFound === true ? (
          <KbnInfoCallout
            title={i18n.translate(
              'xpack.aiops.logCategorization.reverseCategorization.matchNotFoundTitle',
              { defaultMessage: 'No pattern matches found' }
            )}
            announceOnMount
            text={
              <FormattedMessage
                id="xpack.aiops.logCategorization.reverseCategorization.matchNotFoundBody"
                defaultMessage="Try adjusting the time range or changing the sampling settings to improve results."
              />
            }
          />
        ) : (
          <>
            <EuiText css={{ fontWeight: 'bold' }}>Pattern</EuiText>
            <EuiSpacer size="s" />
            <EuiText>
              {data?.selectedCategory?.regex !== undefined ? (
                <PatternCellRenderer pattern={data.selectedCategory?.regex} />
              ) : (
                <EuiSkeletonText lines={2} />
              )}
            </EuiText>

            <EuiSpacer size="l" />

            <EuiText css={{ fontWeight: 'bold' }}>
              {data?.docs.length ? (
                <FormattedMessage
                  id="xpack.aiops.logCategorization.reverseCategorization.matchingDocumentsTitle"
                  defaultMessage="{count} documents which match the same pattern"
                  values={{ count: data?.docCount ?? 0 }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.aiops.logCategorization.reverseCategorization.noMatchingDocumentsTitle"
                  defaultMessage="Documents which match the same pattern"
                />
              )}
            </EuiText>

            <EuiSpacer size="s" />

            {loading === false && data !== null && data.categories.length > 0 ? (
              <>
                <MiniHistogram
                  chartData={histogram}
                  isLoading={false}
                  label={''}
                  width={'100%'}
                  height={'100px'}
                />

                <EuiSpacer size="l" />

                {data.docs && data.docs.length > 0 && (
                  <EuiBasicTable
                    tableCaption={i18n.translate(
                      'xpack.aiops.logCategorization.reverseCategorization.docsTableCaption',
                      {
                        defaultMessage: 'Documents matching the selected category',
                      }
                    )}
                    data-test-subj="aiopsReverseCategorizationDocsTable"
                    compressed
                    items={docsPagination.pageOfItems}
                    columns={docsTableColumns}
                    pagination={
                      docsPagination.pagination.totalItemCount > docsPagination.pagination.pageSize
                        ? docsPagination.pagination
                        : undefined
                    }
                    onChange={onTableChange}
                  />
                )}
              </>
            ) : (
              <>
                <EuiSkeletonRectangle width="100%" height="120px" />
                <EuiSpacer size="m" />
                <EuiSkeletonText lines={10} />
              </>
            )}
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              disabled={data === null || data.docs.length === 0}
              onClick={() => openCategoryInDiscover(QUERY_MODE.INCLUDE)}
              data-test-subj="aiopsReverseCategorizationDocsTableOpenDocumentsInDiscoverButton"
            >
              <FormattedMessage
                id="xpack.aiops.logCategorization.reverseCategorization.openDocumentsInDiscoverButtonLabel"
                defaultMessage="Open documents in Discover"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              disabled={data === null || data.docs.length === 0}
              onClick={() => openCategoryInDiscover(QUERY_MODE.EXCLUDE)}
              data-test-subj="aiopsReverseCategorizationDocsTableFilterOutDocumentsInDiscoverButton"
            >
              <FormattedMessage
                id="xpack.aiops.logCategorization.reverseCategorization.filterOutDocumentsInDiscoverButtonLabel"
                defaultMessage="Filter out documents in Discover"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={true} />
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

interface HeaderProps {
  fieldName: string;
  randomSampler: ReturnType<typeof useCategorizeRequest>['randomSampler'] | undefined;
  reload: () => void;
}

const Header: FC<HeaderProps> = ({ fieldName, randomSampler, reload }) => (
  <EuiFlyoutHeader hasBorder>
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle size="m">
          <h2 id="flyoutTitle" data-test-subj="mlJobSelectorFlyoutTitle">
            <FormattedMessage
              id="xpack.aiops.logCategorization.reverseCategorization.title"
              defaultMessage="Similar values of {name}"
              values={{ name: fieldName }}
            />
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem />
      <EuiFlexItem grow={false}>
        {randomSampler ? <SamplingMenu randomSampler={randomSampler} reload={reload} /> : null}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>&nbsp;</EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlyoutHeader>
);
