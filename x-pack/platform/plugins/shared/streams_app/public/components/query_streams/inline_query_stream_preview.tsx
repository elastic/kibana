/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingElastic,
  EuiProgress,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import type { SampleDocument } from '@kbn/streams-schema';
import { MemoPreviewTable } from '../data_management/shared';
import { AssetImage } from '../asset_image';

/**
 * Props for the InlineQueryStreamPreview component
 */
export interface InlineQueryStreamPreviewProps {
  /**
   * The ES|QL query to execute and preview
   */
  esqlQuery: string;
  /**
   * Function to execute the query and return sample documents
   */
  onExecuteQuery: (query: string) => Promise<void>;
  /**
   * Whether the query is currently being executed
   */
  isLoading?: boolean;
  /**
   * Error from query execution, if any
   */
  error?: Error;
  /**
   * Sample documents returned from the query
   */
  documents?: SampleDocument[];
  /**
   * Whether to automatically execute the query when esqlQuery changes
   * @default false
   */
  autoExecute?: boolean;
}

/**
 * A reusable component for displaying inline query stream previews.
 * Shows the results of an ES|QL query execution in a compact table format.
 *
 * @example
 * ```tsx
 * const { executeQuery, isLoading, error, documents } = useExecuteQueryStreamPreview();
 *
 * <InlineQueryStreamPreview
 *   esqlQuery="FROM logs | LIMIT 10"
 *   onExecuteQuery={executeQuery}
 *   isLoading={isLoading}
 *   error={error}
 *   documents={documents}
 *   autoExecute
 * />
 * ```
 */
export function InlineQueryStreamPreview({
  esqlQuery,
  onExecuteQuery,
  isLoading = false,
  error,
  documents,
  autoExecute = false,
}: InlineQueryStreamPreviewProps) {
  const hasDocuments = documents && !isEmpty(documents);
  const [sorting, setSorting] = useState<{
    fieldName?: string;
    direction: 'asc' | 'desc';
  }>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>();

  // Auto-execute query when it changes (if enabled)
  useEffect(() => {
    if (autoExecute && esqlQuery) {
      onExecuteQuery(esqlQuery);
    }
  }, [autoExecute, esqlQuery, onExecuteQuery]);

  let content: React.ReactNode | null = null;

  if (isLoading && !hasDocuments) {
    content = (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingElastic size="xl" />
        </EuiFlexItem>
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
            {i18n.translate('xpack.streams.inlineQueryStreamPreview.previewError', {
              defaultMessage: 'Error loading preview',
            })}
          </h2>
        }
        body={
          <EuiText size="s" color="subdued">
            {error.message}
          </EuiText>
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
            {i18n.translate('xpack.streams.inlineQueryStreamPreview.previewEmpty', {
              defaultMessage: 'No documents to preview',
            })}
          </h2>
        }
        body={
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.streams.inlineQueryStreamPreview.previewEmptyDescription', {
              defaultMessage: 'Run your query to see preview results.',
            })}
          </EuiText>
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

