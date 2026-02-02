/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingElastic,
  EuiProgress,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import type { SampleDocument } from '@kbn/streams-schema';
import { MemoPreviewTable } from '../data_management/shared';
import { AssetImage } from '../asset_image';

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
  const hasDocuments = documents && !isEmpty(documents);

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
        body={error.message}
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
