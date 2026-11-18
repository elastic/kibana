/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiDataGrid,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  type EuiDataGridCellValueElementProps,
  type EuiDataGridColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { EsqlQueryExecution } from './use_esql_query_execution';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

interface Props {
  execution: EsqlQueryExecution;
  runShortcutLabel: string;
}

export const EsqlResultsTable: FC<Props> = ({ execution, runShortcutLabel }) => {
  const { columns, rows, isLoading, error, hasRun } = execution;

  const gridColumns: EuiDataGridColumn[] = useMemo(
    () => columns.map(({ id, displayAsText, esType }) => ({ id, displayAsText, schema: esType })),
    [columns]
  );

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  useEffect(() => {
    setVisibleColumns(columns.map(({ id }) => id));
  }, [columns]);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE_OPTIONS[0] });
  const onChangePage = useCallback((pageIndex: number) => {
    setPagination((prev) => ({ ...prev, pageIndex }));
  }, []);
  const onChangeItemsPerPage = useCallback((pageSize: number) => {
    setPagination({ pageIndex: 0, pageSize });
  }, []);

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => (
      <>{rows[rowIndex]?.[columnId] ?? '—'}</>
    ),
    [rows]
  );

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!hasRun) {
    return (
      <EuiEmptyPrompt
        iconType="play"
        data-test-subj="mlEsqlQueryResultsRunPrompt"
        title={
          <h4>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.esqlQueryStep.runPromptTitle"
              defaultMessage="Run your query to see results"
            />
          </h4>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.esqlQueryStep.runPromptDescription"
              defaultMessage="Click <strong>Search</strong> or press <strong>{shortcut}</strong> to run the query."
              values={{
                shortcut: runShortcutLabel,
                strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
              }}
            />
          </p>
        }
      />
    );
  }

  if (error !== null) {
    return (
      <KbnDangerCallout
        announceOnMount
        data-test-subj="mlEsqlQueryResultsError"
        title={i18n.translate('xpack.ml.newJob.wizard.esqlQueryStep.queryErrorTitle', {
          defaultMessage: 'Query error',
        })}
        text={<p>{error}</p>}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="magnify"
        data-test-subj="mlEsqlQueryResultsEmpty"
        title={
          <h4>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.esqlQueryStep.noResultsTitle"
              defaultMessage="No results"
            />
          </h4>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.esqlQueryStep.noResultsDescription"
              defaultMessage="The query returned no results for the selected time range."
            />
          </p>
        }
      />
    );
  }

  return (
    <div data-test-subj="mlEsqlQueryResultsTable">
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.ml.newJob.wizard.esqlQueryStep.resultCountLabel', {
          defaultMessage: '{count, plural, one {# result} other {# results}}',
          values: { count: rows.length },
        })}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiDataGrid
        aria-label={i18n.translate('xpack.ml.newJob.wizard.esqlQueryStep.resultsAriaLabel', {
          defaultMessage: 'Query results',
        })}
        columns={gridColumns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        rowCount={rows.length}
        renderCellValue={renderCellValue}
        pagination={{
          ...pagination,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          onChangePage,
          onChangeItemsPerPage,
        }}
        gridStyle={{ border: 'all', header: 'shade', fontSize: 's', cellPadding: 's' }}
        toolbarVisibility={{
          showColumnSelector: true,
          showSortSelector: true,
          showFullScreenSelector: false,
        }}
      />
    </div>
  );
};
