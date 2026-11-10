/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ExportFormat, FilterOperator, IndexKind } from '../../common/types';

export const i18nTexts = {
  appTitle: i18n.translate('xpack.indexExplorer.appTitle', { defaultMessage: 'Index Explorer' }),
  appDescription: i18n.translate('xpack.indexExplorer.appDescription', {
    defaultMessage:
      'Explore your Elasticsearch data: browse indices, filter and facet documents, run ES|QL queries, and export the results.',
  }),
  loading: i18n.translate('xpack.indexExplorer.loading', { defaultMessage: 'Loading…' }),
  loadMetadataError: i18n.translate('xpack.indexExplorer.loadMetadataError', {
    defaultMessage: 'Unable to load Index Explorer configuration',
  }),

  // Home page
  indicesTitle: i18n.translate('xpack.indexExplorer.home.indicesTitle', {
    defaultMessage: 'Indices, data streams and aliases',
  }),
  cannedQueriesTitle: i18n.translate('xpack.indexExplorer.home.cannedQueriesTitle', {
    defaultMessage: 'Canned queries',
  }),
  runEsqlQuery: i18n.translate('xpack.indexExplorer.home.runEsqlQuery', {
    defaultMessage: 'Run an ES|QL query',
  }),
  loadIndicesError: i18n.translate('xpack.indexExplorer.home.loadIndicesError', {
    defaultMessage: 'Unable to list indices',
  }),
  filterIndicesPlaceholder: i18n.translate('xpack.indexExplorer.home.filterIndicesPlaceholder', {
    defaultMessage: 'Filter by name',
  }),
  includeHidden: i18n.translate('xpack.indexExplorer.home.includeHidden', {
    defaultMessage: 'Include hidden',
  }),
  noIndices: i18n.translate('xpack.indexExplorer.home.noIndices', {
    defaultMessage: 'No indices found',
  }),
  nameColumn: i18n.translate('xpack.indexExplorer.home.nameColumn', { defaultMessage: 'Name' }),
  kindColumn: i18n.translate('xpack.indexExplorer.home.kindColumn', { defaultMessage: 'Type' }),
  docsCountColumn: i18n.translate('xpack.indexExplorer.home.docsCountColumn', {
    defaultMessage: 'Documents',
  }),
  descriptionColumn: i18n.translate('xpack.indexExplorer.home.descriptionColumn', {
    defaultMessage: 'Description',
  }),
  kinds: {
    index: i18n.translate('xpack.indexExplorer.home.kind.index', { defaultMessage: 'Index' }),
    data_stream: i18n.translate('xpack.indexExplorer.home.kind.dataStream', {
      defaultMessage: 'Data stream',
    }),
    alias: i18n.translate('xpack.indexExplorer.home.kind.alias', { defaultMessage: 'Alias' }),
  } satisfies Record<IndexKind, string>,

  // Index page
  editInEsql: i18n.translate('xpack.indexExplorer.editInEsql', {
    defaultMessage: 'Edit in ES|QL',
  }),
  generatedEsqlTitle: i18n.translate('xpack.indexExplorer.generatedEsqlTitle', {
    defaultMessage: 'ES|QL query',
  }),
  generatedEsqlParamsTitle: i18n.translate('xpack.indexExplorer.generatedEsqlParamsTitle', {
    defaultMessage: 'Parameters',
  }),
  searchError: i18n.translate('xpack.indexExplorer.index.searchError', {
    defaultMessage: 'Search failed',
  }),
  searchPlaceholder: i18n.translate('xpack.indexExplorer.index.searchPlaceholder', {
    defaultMessage: 'Search all fields (query string syntax)',
  }),
  filterFieldLabel: i18n.translate('xpack.indexExplorer.index.filterFieldLabel', {
    defaultMessage: 'Field',
  }),
  filterOperatorLabel: i18n.translate('xpack.indexExplorer.index.filterOperatorLabel', {
    defaultMessage: 'Operator',
  }),
  filterValueLabel: i18n.translate('xpack.indexExplorer.index.filterValueLabel', {
    defaultMessage: 'Value',
  }),
  filterSelectValue: i18n.translate('xpack.indexExplorer.index.filterSelectValue', {
    defaultMessage: 'Select a value',
  }),
  filterSelectValues: i18n.translate('xpack.indexExplorer.index.filterSelectValues', {
    defaultMessage: 'Select values',
  }),
  filterListValuePlaceholder: i18n.translate(
    'xpack.indexExplorer.index.filterListValuePlaceholder',
    {
      defaultMessage: 'Comma-separated values',
    }
  ),
  addFilter: i18n.translate('xpack.indexExplorer.index.addFilter', {
    defaultMessage: 'Add filter',
  }),
  editFilter: i18n.translate('xpack.indexExplorer.index.editFilter', {
    defaultMessage: 'Edit filter',
  }),
  updateFilter: i18n.translate('xpack.indexExplorer.index.updateFilter', {
    defaultMessage: 'Update filter',
  }),
  removeFilter: i18n.translate('xpack.indexExplorer.index.removeFilter', {
    defaultMessage: 'Remove filter',
  }),
  operatorLabels: {
    exact: '=',
    not: '≠',
    contains: i18n.translate('xpack.indexExplorer.operator.contains', {
      defaultMessage: 'contains',
    }),
    startswith: i18n.translate('xpack.indexExplorer.operator.startsWith', {
      defaultMessage: 'starts with',
    }),
    gt: '>',
    gte: '≥',
    lt: '<',
    lte: '≤',
    in: i18n.translate('xpack.indexExplorer.operator.in', { defaultMessage: 'in' }),
    notin: i18n.translate('xpack.indexExplorer.operator.notIn', { defaultMessage: 'not in' }),
    exists: i18n.translate('xpack.indexExplorer.operator.exists', { defaultMessage: 'exists' }),
    missing: i18n.translate('xpack.indexExplorer.operator.missing', {
      defaultMessage: 'is missing',
    }),
  } satisfies Record<FilterOperator, string>,
  suggestedFacets: i18n.translate('xpack.indexExplorer.index.suggestedFacets', {
    defaultMessage: 'Suggested facets:',
  }),
  removeFacet: (field: string) =>
    i18n.translate('xpack.indexExplorer.index.removeFacet', {
      defaultMessage: 'Remove facet {field}',
      values: { field },
    }),
  noFacetValues: i18n.translate('xpack.indexExplorer.index.noFacetValues', {
    defaultMessage: 'No values',
  }),
  otherFacetValues: (count: number) =>
    i18n.translate('xpack.indexExplorer.index.otherFacetValues', {
      defaultMessage: '{count, plural, one {# other document} other {# other documents}}',
      values: { count },
    }),
  documentCount: (total: number, filters: string, search: string) => {
    const count = i18n.translate('xpack.indexExplorer.index.documentCount', {
      defaultMessage: '{total, plural, one {# document} other {# documents}}',
      values: { total },
    });
    const where = filters
      ? i18n.translate('xpack.indexExplorer.index.documentCountWhere', {
          defaultMessage: 'where {filters}',
          values: { filters },
        })
      : '';
    const matching = search
      ? i18n.translate('xpack.indexExplorer.index.documentCountMatching', {
          defaultMessage: 'matching "{search}"',
          values: { search },
        })
      : '';
    return [count, where, matching].filter(Boolean).join(' ');
  },
  histogramSeriesName: i18n.translate('xpack.indexExplorer.index.histogramSeriesName', {
    defaultMessage: 'Documents',
  }),
  facetByLabel: i18n.translate('xpack.indexExplorer.index.facetByLabel', {
    defaultMessage: 'Facet by…',
  }),
  columnsButton: (visible: number, total: number) =>
    i18n.translate('xpack.indexExplorer.index.columnsButton', {
      defaultMessage: 'Columns ({visible}/{total})',
      values: { visible, total },
    }),
  columnsTitle: i18n.translate('xpack.indexExplorer.index.columnsTitle', {
    defaultMessage: 'Columns',
  }),
  columnsSearchPlaceholder: i18n.translate('xpack.indexExplorer.index.columnsSearchPlaceholder', {
    defaultMessage: 'Find a column',
  }),
  viewDocument: i18n.translate('xpack.indexExplorer.index.viewDocument', {
    defaultMessage: 'View document',
  }),
  resetColumns: i18n.translate('xpack.indexExplorer.index.resetColumns', {
    defaultMessage: 'Reset to default columns',
  }),
  documentsTableCaption: (index: string) =>
    i18n.translate('xpack.indexExplorer.index.documentsTableCaption', {
      defaultMessage: 'Documents in {index}',
      values: { index },
    }),
  noDocuments: i18n.translate('xpack.indexExplorer.index.noDocuments', {
    defaultMessage: 'No documents match',
  }),
  exportAs: (format: ExportFormat) =>
    i18n.translate('xpack.indexExplorer.exportAs', {
      defaultMessage: 'Export {format}',
      values: { format: format.toUpperCase() },
    }),
  exportFailed: i18n.translate('xpack.indexExplorer.exportFailed', {
    defaultMessage: 'Export failed',
  }),

  // Document page
  documentIndexLabel: i18n.translate('xpack.indexExplorer.document.indexLabel', {
    defaultMessage: 'Index:',
  }),
  loadDocumentError: i18n.translate('xpack.indexExplorer.document.loadError', {
    defaultMessage: 'Unable to load document',
  }),
  fieldsTableCaption: i18n.translate('xpack.indexExplorer.document.fieldsTableCaption', {
    defaultMessage: 'Document fields',
  }),
  fieldColumn: i18n.translate('xpack.indexExplorer.document.fieldColumn', {
    defaultMessage: 'Field',
  }),
  valueColumn: i18n.translate('xpack.indexExplorer.document.valueColumn', {
    defaultMessage: 'Value',
  }),
  sourceTitle: i18n.translate('xpack.indexExplorer.document.sourceTitle', {
    defaultMessage: '_source',
  }),

  // Query pages
  queryPageTitle: i18n.translate('xpack.indexExplorer.query.title', {
    defaultMessage: 'ES|QL query',
  }),
  queryPageDescription: i18n.translate('xpack.indexExplorer.query.description', {
    defaultMessage:
      'Use ?name placeholders for parameters. Press Cmd/Ctrl+Enter to run. The URL updates with every run, so you can share it.',
  }),
  esqlEditorLabel: i18n.translate('xpack.indexExplorer.query.editorLabel', {
    defaultMessage: 'ES|QL query editor',
  }),
  runQuery: i18n.translate('xpack.indexExplorer.query.run', { defaultMessage: 'Run query' }),
  paramTypeLabel: (name: string) =>
    i18n.translate('xpack.indexExplorer.query.paramTypeLabel', {
      defaultMessage: 'Type of parameter {name}',
      values: { name },
    }),
  esqlError: i18n.translate('xpack.indexExplorer.query.error', { defaultMessage: 'Query failed' }),
  visualizationTitle: i18n.translate('xpack.indexExplorer.query.visualizationTitle', {
    defaultMessage: 'Visualization',
  }),
  visualizationHistogram: (field: string, interval: string) =>
    i18n.translate('xpack.indexExplorer.query.visualizationHistogram', {
      defaultMessage: 'Count of rows over {field}, per {interval}',
      values: { field, interval },
    }),
  editVisualization: i18n.translate('xpack.indexExplorer.query.editVisualization', {
    defaultMessage: 'Edit visualization',
  }),
  closeVisualizationEditor: i18n.translate('xpack.indexExplorer.query.closeVisualizationEditor', {
    defaultMessage: 'Close editor',
  }),
  applyVisualization: i18n.translate('xpack.indexExplorer.query.applyVisualization', {
    defaultMessage: 'Apply',
  }),
  noVisualization: i18n.translate('xpack.indexExplorer.query.noVisualization', {
    defaultMessage:
      'No chart is suggested for these results. Aggregate with STATS ... BY, or include a date column, to get a chart.',
  }),
  esqlPartial: i18n.translate('xpack.indexExplorer.query.partial', {
    defaultMessage: 'Results are partial because some shards or clusters failed.',
  }),
  esqlSummary: (rows: number, took?: number) =>
    took === undefined
      ? i18n.translate('xpack.indexExplorer.query.summary', {
          defaultMessage: '{rows, plural, one {# row} other {# rows}}',
          values: { rows },
        })
      : i18n.translate('xpack.indexExplorer.query.summaryWithTime', {
          defaultMessage: '{rows, plural, one {# row} other {# rows}} in {took}ms',
          values: { rows, took },
        }),
  esqlResultsCaption: i18n.translate('xpack.indexExplorer.query.resultsCaption', {
    defaultMessage: 'ES|QL query results',
  }),
  noEsqlRows: i18n.translate('xpack.indexExplorer.query.noRows', {
    defaultMessage: 'The query returned no rows',
  }),
  editAsNewQuery: i18n.translate('xpack.indexExplorer.cannedQuery.edit', {
    defaultMessage: 'Edit as new query',
  }),
  cannedQueryNotFoundTitle: i18n.translate('xpack.indexExplorer.cannedQuery.notFoundTitle', {
    defaultMessage: 'Canned query not found',
  }),
  cannedQueryNotFoundBody: (id: string) =>
    i18n.translate('xpack.indexExplorer.cannedQuery.notFoundBody', {
      defaultMessage: 'No query with id "{id}" is configured under xpack.indexExplorer.queries.',
      values: { id },
    }),
} as const;
