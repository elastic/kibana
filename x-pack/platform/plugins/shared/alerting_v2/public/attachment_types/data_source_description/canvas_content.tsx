/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiDataGrid,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiSpacer,
  type EuiDataGridColumn,
  type UseEuiTheme,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { ESQLLangEditor } from '@kbn/esql/public';
import type { AggregateQuery } from '@kbn/es-query';
import { getESQLResults } from '@kbn/esql-utils';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { ISearchGeneric } from '@kbn/search-types';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type {
  AttachmentRenderProps,
  ActionButton,
  CanvasRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { DataSourceDescriptionAttachment } from '../../../common/attachment_types';

const canvasStyles = {
  root: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 400,
  }),
  editor: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.s,
      minHeight: 80,
    }),
  grid: css({
    flex: 1,
    minHeight: 200,
    overflow: 'hidden',
  }),
};

interface CanvasContentProps extends AttachmentRenderProps<DataSourceDescriptionAttachment> {
  registerActionButtons: CanvasRenderCallbacks['registerActionButtons'];
  search: ISearchGeneric;
  discoverLocator?: LocatorPublic<DiscoverAppLocatorParams>;
}

export const DataSourceDescriptionCanvasContent = ({
  attachment,
  registerActionButtons,
  search,
  discoverLocator,
}: CanvasContentProps) => {
  const styles = useMemoCss(canvasStyles);
  const { data } = attachment;

  const [query, setQuery] = useState<AggregateQuery>({ esql: data.esqlQuery });
  const [columns, setColumns] = useState<EuiDataGridColumn[]>([]);
  const [rows, setRows] = useState<unknown[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runQuery = useCallback(
    async (esqlQuery: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const { response } = await getESQLResults({
          esqlQuery,
          search,
          signal: controller.signal,
          dropNullColumns: true,
        });

        const typedResponse = response as ESQLSearchResponse;
        const esqlColumns = typedResponse.columns ?? [];
        const esqlRows = typedResponse.values ?? [];

        setColumns(esqlColumns.map((col) => ({ id: col.name, displayAsText: col.name })));
        setRows(esqlRows);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    },
    [search]
  );

  useEffect(() => {
    runQuery(data.esqlQuery);
    return () => abortRef.current?.abort();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQueryChange = useCallback((newQuery: AggregateQuery) => {
    setQuery(newQuery);
  }, []);

  const handleQuerySubmit = useCallback(async () => {
    await runQuery(query.esql);
  }, [query, runQuery]);

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    setVisibleColumns(columns.map((col) => col.id));
  }, [columns]);

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      const colIdx = columns.findIndex((c) => c.id === columnId);
      if (colIdx === -1) return null;
      const value = rows[rowIndex]?.[colIdx];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    },
    [columns, rows]
  );

  useEffect(() => {
    const buttons: ActionButton[] = [];
    if (discoverLocator) {
      buttons.push({
        label: 'View in Discover',
        icon: 'discoverApp',
        type: ActionButtonType.PRIMARY,
        handler: () => {
          const url = discoverLocator.getRedirectUrl({
            query: { esql: query.esql },
            timeRange: {
              from: data.timeRange.start,
              to: data.timeRange.end,
            },
          });
          if (url) {
            window.open(url, '_blank');
          }
        },
      });
    }
    registerActionButtons(buttons);
  }, [discoverLocator, query, data.timeRange, registerActionButtons]);

  return (
    <div css={styles.root}>
      <div css={styles.editor}>
        <ESQLLangEditor
          query={query}
          onTextLangQueryChange={handleQueryChange}
          onTextLangQuerySubmit={handleQuerySubmit}
          isLoading={loading}
          isDisabled={false}
          editorIsInline
          hasOutline
          hideQueryHistory
          disableAutoFocus
          expandToFitQueryOnMount
          dataTestSubj="dataSourceDescriptionEsqlEditor"
        />
      </div>

      <EuiSpacer size="s" />

      <div css={styles.grid}>
        {error && (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiCallOut announceOnMount title="Query error" color="danger" iconType="error">
                {error}
              </EuiCallOut>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        {loading && !error && (
          <EuiFlexGroup justifyContent="center" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        {!loading && !error && rows.length === 0 && (
          <EuiEmptyPrompt
            iconType="discoverApp"
            title={<h3>No results</h3>}
            body={<p>The query returned no data. Try adjusting the ES|QL query above.</p>}
          />
        )}

        {!loading && !error && rows.length > 0 && (
          <EuiDataGrid
            aria-label={`Data from ${data.index}`}
            columns={columns}
            columnVisibility={{ visibleColumns, setVisibleColumns }}
            rowCount={rows.length}
            renderCellValue={renderCellValue}
            toolbarVisibility={{
              showColumnSelector: true,
              showSortSelector: false,
              showFullScreenSelector: true,
              showDisplaySelector: false,
            }}
            gridStyle={{ border: 'none', header: 'shade' }}
            data-test-subj="dataSourceDescriptionDataGrid"
          />
        )}
      </div>
    </div>
  );
};
