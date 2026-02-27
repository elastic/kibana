/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingElastic,
  EuiProgress,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { ESQL_VIEW_PREFIX, Streams } from '@kbn/streams-schema';
import type { SampleDocument } from '@kbn/streams-schema';
import { MemoPreviewTable } from '../data_management/shared';
import { AssetImage } from '../asset_image';
import { useKibana } from '../../hooks/use_kibana';

interface QueryStreamPreviewPanelProps {
  documents?: SampleDocument[];
  isLoading: boolean;
  error: Error | undefined;
}

export function QueryStreamPreviewPanel({
  documents,
  isLoading,
  error,
}: QueryStreamPreviewPanelProps) {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;
  const hasDocuments = documents && !isEmpty(documents);

  const unknownIndexName = useMemo(() => {
    if (!error?.message) return undefined;
    const match = error.message.match(/Unknown index \[([^\]]+)\]/);
    if (!match || match[1].startsWith(ESQL_VIEW_PREFIX)) return undefined;
    return match[1];
  }, [error]);

  const [confirmedQueryStreamName, setConfirmedQueryStreamName] = useState<string>();

  useEffect(() => {
    if (!unknownIndexName) {
      setConfirmedQueryStreamName(undefined);
      return;
    }
    const abortController = new AbortController();
    streamsRepositoryClient
      .fetch('GET /api/streams/{name} 2023-10-31', {
        params: { path: { name: unknownIndexName } },
        signal: abortController.signal,
      })
      .then((response) => {
        if (!abortController.signal.aborted && Streams.QueryStream.Definition.is(response.stream)) {
          setConfirmedQueryStreamName(unknownIndexName);
        }
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setConfirmedQueryStreamName(undefined);
        }
      });
    return () => {
      abortController.abort();
    };
  }, [unknownIndexName, streamsRepositoryClient]);

  const queryStreamHint = confirmedQueryStreamName
    ? {
        indexName: confirmedQueryStreamName,
        suggestedView: `${ESQL_VIEW_PREFIX}${confirmedQueryStreamName}`,
      }
    : undefined;

  const [sorting, setSorting] = useState<{
    fieldName?: string;
    direction: 'asc' | 'desc';
  }>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>();

  let content: React.ReactNode | null = null;

  if (isLoading && !hasDocuments) {
    content = (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiLoadingElastic size="xl" />
      </EuiFlexGroup>
    );
  } else if (error) {
    content = (
      <EuiEmptyPrompt
        icon={<AssetImage type="noResults" />}
        color="danger"
        titleSize="s"
        title={
          <h2>
            {i18n.translate('xpack.streams.queryStreamFlyout.previewError', {
              defaultMessage: 'Error loading preview',
            })}
          </h2>
        }
        body={
          <>
            <p>{error.message}</p>
            {queryStreamHint && (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut
                  announceOnMount
                  title={i18n.translate('xpack.streams.queryStreamPreview.unknownIndexHint', {
                    defaultMessage: '"{indexName}" is a query stream — use FROM {suggestedView}',
                    values: {
                      indexName: queryStreamHint.indexName,
                      suggestedView: queryStreamHint.suggestedView,
                    },
                  })}
                  color="warning"
                  iconType="help"
                  size="s"
                >
                  <p>
                    {i18n.translate('xpack.streams.queryStreamPreview.unknownIndexExplanation', {
                      defaultMessage:
                        'Query streams use a {prefix} prefix for their ES|QL view names and must be referenced with it.',
                      values: { prefix: ESQL_VIEW_PREFIX },
                    })}
                  </p>
                </EuiCallOut>
              </>
            )}
          </>
        }
      />
    );
  } else if (!hasDocuments) {
    content = (
      <EuiEmptyPrompt
        icon={<AssetImage type="noResults" />}
        titleSize="xxs"
        title={
          <h2>
            {i18n.translate('xpack.streams.queryStreamFlyout.previewEmpty', {
              defaultMessage: 'No documents to preview',
            })}
          </h2>
        }
      />
    );
  } else if (hasDocuments) {
    content = (
      <EuiFlexItem grow>
        <MemoPreviewTable
          documents={documents}
          sorting={sorting}
          setSorting={setSorting}
          toolbarVisibility={true}
          displayColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          showLeadingControlColumns={false}
        />
      </EuiFlexItem>
    );
  }

  return (
    <>
      {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
      {content}
    </>
  );
}
