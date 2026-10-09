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
import { KbnInfoCallout } from '@kbn/ui-callout';
import moment from 'moment-timezone';

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePageUrlState } from '@kbn/ml-url-state';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';

import type { Filter } from '@kbn/es-query';
import { buildEmptyFilter, buildEsQuery, isOfAggregateQueryType } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-service';
import { QUERY_MODE } from '@kbn/aiops-log-pattern-analysis/get_category_query';

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
  findCategoryMatchingFieldValue,
  getEsqlDocumentScopeQuery,
} from './build_esql_analysis_queries';
import { runEsqlCategorizeRequest } from './run_esql_categorize_request';

type SparkLinesPerCategory = Record<string, Record<number, number>>;

export interface ReverseCategorizationPageProps {
  dataView: DataView;
  savedSearch: SavedSearch | null;
  selectedField: DataViewField;
  fieldValue: string;
  onClose: () => void;
}

const BAR_TARGET = 60;

export const ReverseCategorizationFlyout: FC<ReverseCategorizationPageProps> = ({
  dataView,
  savedSearch,
  selectedField,
  fieldValue,
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

  const { filters, query } = useMemo(() => getState(), [getState]);
  const isEsqlQuery = isOfAggregateQueryType(query);
  const [matchNotFound, setMatchNotFound] = useState(false);

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
      searchQuery: buildEsQuery(
        dataView,
        isEsqlQuery ? [] : query ?? [],
        filters ?? [],
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
    undefined,
    undefined,
    esqlDocumentScope
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

  const { openInDiscover } = useActions(
    dataView.id!,
    selectedField,
    selectedCategory ? [selectedCategory] : [],
    stateFromUrl,
    timefilter,
    onAddFilter,
    undefined,
    onClose
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

        {matchNotFound === true ? (
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
              onClick={() => openInDiscover.openFunction(QUERY_MODE.INCLUDE, false)}
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
              onClick={() => openInDiscover.openFunction(QUERY_MODE.EXCLUDE, false)}
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
    </EuiFlexGroup>
  </EuiFlyoutHeader>
);
