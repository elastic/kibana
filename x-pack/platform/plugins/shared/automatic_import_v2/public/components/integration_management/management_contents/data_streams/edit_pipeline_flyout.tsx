/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSearchBarProps, EuiTokenProps } from '@elastic/eui';
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

export const getIconFromType = (type: string | null | undefined): EuiTokenProps['iconType'] => {
  switch (type) {
    case 'string':
      return 'tokenString';
    case 'keyword':
      return 'tokenKeyword';
    case 'number':
    case 'long':
      return 'tokenNumber';
    case 'date':
      return 'tokenDate';
    case 'ip':
    case 'geo_point':
      return 'tokenGeo';
    case 'object':
      return 'tokenQuestion';
    case 'float':
      return 'tokenNumber';
    case 'nested':
      return 'tokenNested';
    case 'boolean':
      return 'tokenBoolean';
    default:
      return 'tokenQuestion';
  }
};

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

const getFieldType = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isInteger(value) ? 'long' : 'float';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'nested';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
  return 'string';
};

const flattenObject = (
  obj: Record<string, unknown>,
  parentKey = ''
): Array<{ field: string; value: string; type: string }> => {
  const result: Array<{ field: string; value: string; type: string }> = [];

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = parentKey ? `${parentKey}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result.push(...flattenObject(value as Record<string, unknown>, fieldName));
    } else {
      result.push({
        field: fieldName,
        value: Array.isArray(value) ? JSON.stringify(value) : String(value ?? ''),
        type: getFieldType(value),
      });
    }
  }

  return result;
};

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
    return flattenObject(currentDoc as Record<string, unknown>);
  }, [data?.results, activeDocument]);

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
    },
  ];

  const search: EuiSearchBarProps = {
    box: {
      incremental: true,
      placeholder: i18n.EDIT_PIPELINE_FLYOUT.filterPlaceholder,
    },
  };

  const pageCount = data?.results?.length ?? 0;

  return (
    <EuiFlyout onClose={onClose}>
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

        {!isLoading && !isError && selectedPipelineTab === 'table' && (
          <EuiInMemoryTable
            items={tableData}
            columns={columns}
            searchFormat="text"
            search={search}
            pagination
            sorting
          />
        )}

        {!isLoading && !isError && selectedPipelineTab === 'pipeline' && data?.ingest_pipeline && (
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
            value={JSON.stringify(data.ingest_pipeline, null, 2)}
          />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

EditPipelineFlyout.displayName = 'EditPipelineFlyout';
