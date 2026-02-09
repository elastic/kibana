/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSearchBarProps } from '@elastic/eui';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiText,
  EuiTitle,
  EuiFlexItem,
  EuiPagination,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiInMemoryTable,
  EuiFlexGroup,
  EuiToken,
  EuiToolTip,
  EuiLoadingSpinner,
  EuiCallOut,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import React, { useState, useMemo } from 'react';
import type { DataStreamResponse } from '../../../../../common';
import { useGetDataStreamResults } from '../../../../common';
import { useUIState } from '../../contexts';
import * as i18n from './translations';
import { getIconFromType, flattenPipelineObject } from './utils';

interface EditPipelineFlyoutProps {
  integrationId: string;
  dataStream: DataStreamResponse;
  onClose: () => void;
}

interface TableRow {
  field: string;
  value: string;
  type: string;
}

export const EditPipelineFlyout = ({
  integrationId,
  dataStream,
  onClose,
}: EditPipelineFlyoutProps) => {
  const [activeDocument, setActiveDocument] = useState(0);
  const { selectedPipelineTab, selectPipelineTab } = useUIState();

  const { data, isLoading, isError } = useGetDataStreamResults(
    integrationId,
    dataStream.dataStreamId
  );

  const tableData = useMemo<TableRow[]>(() => {
    if (!data?.results || data.results.length === 0) return [];
    const currentDoc = data.results[activeDocument];
    if (!currentDoc) return [];
    return flattenPipelineObject(currentDoc as Record<string, unknown>);
  }, [data?.results, activeDocument]);

  const stringifiedPipeline = useMemo(() => {
    if (!data?.ingest_pipeline) return '';
    try {
      return JSON.stringify(data.ingest_pipeline, null, 2);
    } catch (_error) {
      return '';
    }
  }, [data?.ingest_pipeline]);

  const handlePageClick = (doc: number) => {
    setActiveDocument(doc);
  };

  const columns = [
    {
      field: 'field',
      name: i18n.TABLE_COLUMN_HEADERS.field,
      sortable: true,
      searchable: true,
      render: (fieldName: string, item: TableRow) => {
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={item.type} anchorProps={{ css: { display: 'flex' } }}>
                <EuiToken iconType={getIconFromType(item.type)} />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{fieldName}</EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'value',
      name: i18n.TABLE_COLUMN_HEADERS.value,
      sortable: true,
      searchable: true,
      truncateText: true,
      render: (value: string) => {
        return (
          <EuiToolTip content={value} anchorProps={{ css: { display: 'flex' } }}>
            <EuiText size="s" tabIndex={0}>
              {value}
            </EuiText>
          </EuiToolTip>
        );
      },
    },
  ];

  const search: EuiSearchBarProps = {
    box: {
      incremental: true,
      placeholder: i18n.EDIT_PIPELINE_FLYOUT.filterPlaceholder,
    },
  };

  const pageCount = data?.results?.length ?? 0;

  const isTableVisible = !isLoading && !isError && selectedPipelineTab === 'table';
  const isEditorVisible =
    !isLoading && !isError && selectedPipelineTab === 'pipeline' && pageCount > 0;

  return (
    <EuiFlyout onClose={onClose} aria-labelledby="editPipelineFlyoutTitle">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="editPipelineFlyoutTitle">{dataStream.title}</h2>
        </EuiTitle>

        <EuiSpacer size="s" />

        <EuiFlexItem grow={false} css={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <EuiText>{i18n.EDIT_PIPELINE_FLYOUT.documents}</EuiText>
          {pageCount > 0 && (
            <EuiPagination
              aria-label={i18n.EDIT_PIPELINE_FLYOUT.paginationAriaLabel}
              onPageClick={handlePageClick}
              activePage={activeDocument}
              pageCount={pageCount}
              compressed
            />
          )}
        </EuiFlexItem>
        <EuiTabs>
          <EuiTab
            isSelected={selectedPipelineTab === 'table'}
            onClick={() => selectPipelineTab('table')}
          >
            {i18n.EDIT_PIPELINE_FLYOUT.tableTab}
          </EuiTab>
          <EuiTab
            isSelected={selectedPipelineTab === 'pipeline'}
            onClick={() => selectPipelineTab('pipeline')}
          >
            {i18n.EDIT_PIPELINE_FLYOUT.pipelineTab}
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isLoading && (
          <EuiFlexGroup justifyContent="center" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        {isError && (
          <EuiCallOut
            announceOnMount
            title={i18n.EDIT_PIPELINE_FLYOUT.errorTitle}
            color="danger"
            iconType="error"
          >
            <p>{i18n.EDIT_PIPELINE_FLYOUT.errorMessage}</p>
          </EuiCallOut>
        )}

        {isTableVisible && (
          <EuiInMemoryTable
            items={tableData}
            columns={columns}
            searchFormat="text"
            search={search}
            tableCaption={i18n.EDIT_PIPELINE_FLYOUT.tableCaption}
            pagination
            sorting
          />
        )}

        {isEditorVisible && (
          <CodeEditor
            isCopyable
            enableFindAction
            languageId="json"
            height="calc(100vh - 280px)"
            width="100%"
            options={{
              readOnly: true,
              tabSize: 2,
              wordWrap: 'on',
            }}
            value={stringifiedPipeline}
          />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

EditPipelineFlyout.displayName = 'EditPipelineFlyout';
