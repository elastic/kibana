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
  EuiButtonEmpty,
  EuiConfirmModal,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { XJsonLang } from '@kbn/monaco';
import type { DataStreamResponse } from '../../../../../common';
import { useGetDataStreamResults, useUpdateDataStreamPipeline } from '../../../../common';
import { useUIState } from '../../contexts';
import * as i18n from './translations';
import { getIconFromType, flattenPipelineObject } from './utils';

interface EditPipelineFlyoutProps {
  integrationId: string;
  dataStream: DataStreamResponse;
  onClose: () => void;
  connectorId?: string;
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
  connectorId,
}: EditPipelineFlyoutProps) => {
  const [activeDocument, setActiveDocument] = useState(0);
  const [pipelineText, setPipelineText] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isCloseConfirmVisible, setIsCloseConfirmVisible] = useState(false);
  const { selectedPipelineTab, selectPipelineTab } = useUIState();

  const { data, isLoading, isError, error } = useGetDataStreamResults(
    integrationId,
    dataStream.dataStreamId
  );
  const { updateDataStreamPipelineMutation } = useUpdateDataStreamPipeline();

  const tableData = useMemo<TableRow[]>(() => {
    if (!data?.results || data.results.length === 0) return [];
    const currentDoc = data.results[activeDocument];
    if (!currentDoc) return [];
    return flattenPipelineObject(currentDoc as Record<string, unknown>);
  }, [data?.results, activeDocument]);

  const handlePageClick = (doc: number) => {
    setActiveDocument(doc);
  };

  const stringifiedPipeline = useMemo(() => {
    if (!data?.ingest_pipeline) return '';
    try {
      return JSON.stringify(data.ingest_pipeline, null, 2);
    } catch (_error) {
      return '';
    }
  }, [data?.ingest_pipeline]);

  useEffect(() => {
    setPipelineText(stringifiedPipeline);
  }, [stringifiedPipeline]);

  useEffect(() => {
    const docsLength = data?.results?.length ?? 0;
    if (activeDocument >= docsLength && docsLength > 0) {
      setActiveDocument(docsLength - 1);
    }
  }, [activeDocument, data?.results?.length]);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    try {
      JSON.parse(pipelineText);
    } catch (e) {
      setSaveError(i18n.EDIT_PIPELINE_FLYOUT.invalidJsonError((e as Error).message));
      return;
    }
    try {
      await updateDataStreamPipelineMutation.mutateAsync({
        integrationId,
        dataStreamId: dataStream.dataStreamId,
        ingestPipeline: pipelineText,
      });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : i18n.EDIT_PIPELINE_FLYOUT.saveErrorMessage);
    }
  }, [updateDataStreamPipelineMutation, integrationId, dataStream.dataStreamId, pipelineText]);

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
  const hasUnsavedChanges = pipelineText !== stringifiedPipeline;

  const isTableVisible = !isLoading && !isError && selectedPipelineTab === 'table';
  const isEditorVisible =
    !isLoading && !isError && selectedPipelineTab === 'pipeline' && pageCount > 0;

  const handleFlyoutClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setIsCloseConfirmVisible(true);
      return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  const handleDiscardAndClose = useCallback(() => {
    setIsCloseConfirmVisible(false);
    onClose();
  }, [onClose]);

  return (
    <EuiFlyout onClose={handleFlyoutClose} aria-labelledby="editPipelineFlyoutTitle">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="editPipelineFlyoutTitle">{dataStream.title}</h2>
        </EuiTitle>

        <EuiSpacer size="s" />

        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText>{i18n.EDIT_PIPELINE_FLYOUT.documents}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
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
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="save"
              onClick={handleSave}
              isLoading={updateDataStreamPipelineMutation.isLoading}
              isDisabled={selectedPipelineTab !== 'pipeline' || !pipelineText.trim()}
              data-test-subj="editPipelineFlyoutSaveButton"
            >
              {i18n.EDIT_PIPELINE_FLYOUT.saveButton}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
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
        {isCloseConfirmVisible && (
          <EuiConfirmModal
            title={i18n.EDIT_PIPELINE_FLYOUT.closeConfirmTitle}
            aria-label={i18n.EDIT_PIPELINE_FLYOUT.closeConfirmTitle}
            onCancel={() => setIsCloseConfirmVisible(false)}
            onConfirm={handleDiscardAndClose}
            cancelButtonText={i18n.EDIT_PIPELINE_FLYOUT.closeConfirmCancel}
            confirmButtonText={i18n.EDIT_PIPELINE_FLYOUT.closeConfirmDiscard}
            defaultFocusedButton="confirm"
            buttonColor="danger"
          >
            <p>{i18n.EDIT_PIPELINE_FLYOUT.closeConfirmBody}</p>
          </EuiConfirmModal>
        )}

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
            <p>{error?.message ?? i18n.EDIT_PIPELINE_FLYOUT.errorMessage}</p>
          </EuiCallOut>
        )}

        {saveError && (
          <EuiCallOut
            announceOnMount
            title={i18n.EDIT_PIPELINE_FLYOUT.saveErrorTitle}
            color="danger"
            iconType="error"
          >
            <p>{saveError}</p>
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
          <div
            onKeyDownCapture={(event) => {
              if (event.key === 'Enter') {
                // Prevent parent form handlers from intercepting Enter while editing JSON.
                event.stopPropagation();
              }
            }}
          >
            <CodeEditor
              isCopyable
              enableFindAction
              languageId={XJsonLang.ID}
              height="calc(100vh - 280px)"
              width="100%"
              options={{
                readOnly: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
              value={pipelineText}
              onChange={setPipelineText}
            />
          </div>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

EditPipelineFlyout.displayName = 'EditPipelineFlyout';
