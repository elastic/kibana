/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody, EuiTitle, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import type { DataStreamResponse, FieldTypeEditState } from '../../../../../common';
import { useGetDataStreamResults } from '../../../../common';
import { useUIState } from '../../contexts';
import { useMappingEditor } from './mapping_editor';
import {
  CloseConfirmModal,
  EditPipelineFlyoutFooter,
  FlyoutStatusCallouts,
  FlyoutTabs,
  PipelineEditorPanel,
  TablePanel,
} from './edit_pipeline_flyout_parts';
import { usePipelineEditor } from './use_pipeline_editor';
import { getFlyoutFooterState } from './utils';

interface EditPipelineFlyoutProps {
  integrationId: string;
  dataStream: DataStreamResponse;
  onClose: () => void;
  fieldTypeEditState: FieldTypeEditState;
}

const EMPTY_DOCUMENTS: Array<Record<string, unknown>> = [];

const usePagedDocuments = (resultCount: number | undefined) => {
  const [activeDocument, setActiveDocument] = useState(0);
  const pageCount = resultCount ?? 0;

  useEffect(() => {
    if (activeDocument >= pageCount && pageCount > 0) {
      setActiveDocument(pageCount - 1);
    }
  }, [activeDocument, pageCount]);

  return { activeDocument, setActiveDocument, pageCount };
};

export const EditPipelineFlyout = ({
  integrationId,
  dataStream,
  onClose,
  fieldTypeEditState,
}: EditPipelineFlyoutProps) => {
  const fieldTypesAreEditable = fieldTypeEditState === 'editable';
  const [isCloseConfirmVisible, setIsCloseConfirmVisible] = useState(false);
  const { selectedPipelineTab, selectPipelineTab } = useUIState();
  const { data, isLoading, isError, error } = useGetDataStreamResults(
    integrationId,
    dataStream.dataStreamId
  );
  const { activeDocument, setActiveDocument, pageCount } = usePagedDocuments(data?.results?.length);
  const pipelineEditor = usePipelineEditor({
    integrationId,
    dataStreamId: dataStream.dataStreamId,
    ingestPipeline: data?.ingest_pipeline,
    version: data?.version ?? '',
  });
  const mappingEditor = useMappingEditor({
    integrationId,
    dataStreamId: dataStream.dataStreamId,
    version: data?.version ?? '',
    fieldMappings: data?.field_mapping,
    fieldTypeOverrides: data?.field_type_overrides,
    documents: data?.results ?? EMPTY_DOCUMENTS,
    activeDocument,
  });

  const isSaving = mappingEditor.isSaving || pipelineEditor.isSaving;
  const hasUnsavedChanges = pipelineEditor.hasUnsavedChanges || mappingEditor.isDirty;
  const isTableVisible = !isLoading && !isError && selectedPipelineTab === 'table';
  const isEditorVisible =
    !isLoading && !isError && selectedPipelineTab === 'pipeline' && Boolean(data?.ingest_pipeline);
  const isTableTab = selectedPipelineTab === 'table';
  const footerState = getFlyoutFooterState({
    isTableTab,
    mappingDirty: mappingEditor.isDirty,
    mappingSaving: mappingEditor.isSaving,
    pipelineDirty: pipelineEditor.hasUnsavedChanges,
    pipelineSaving: pipelineEditor.isSaving,
    pipelineText: pipelineEditor.pipelineText,
    isSaving,
    showPipelineWarning: isTableVisible && pipelineEditor.hasUnsavedChanges,
    showTableWarning: isEditorVisible && mappingEditor.isDirty,
  });

  const handleFlyoutClose = useCallback(() => {
    if (isSaving) return;
    if (hasUnsavedChanges) {
      setIsCloseConfirmVisible(true);
      return;
    }
    onClose();
  }, [hasUnsavedChanges, isSaving, onClose]);

  const handleFooterSave = useCallback(async () => {
    const saved = isTableTab ? await mappingEditor.save() : await pipelineEditor.save();
    if (saved) onClose();
  }, [isTableTab, mappingEditor, onClose, pipelineEditor]);

  const handleFooterReset = useCallback(() => {
    if (isTableTab) {
      mappingEditor.discardChanges();
      return;
    }
    pipelineEditor.reset();
  }, [isTableTab, mappingEditor, pipelineEditor]);

  const handleDiscardAndClose = useCallback(() => {
    if (isSaving) return;
    setIsCloseConfirmVisible(false);
    onClose();
  }, [isSaving, onClose]);

  const showFooter = (isTableVisible && fieldTypesAreEditable) || isEditorVisible;

  return (
    <EuiFlyout
      onClose={handleFlyoutClose}
      aria-labelledby="editPipelineFlyoutTitle"
      data-test-subj="editPipelineFlyout"
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="editPipelineFlyoutTitle">{dataStream.title}</h2>
        </EuiTitle>

        <EuiSpacer size="s" />

        <FlyoutTabs
          isTableTab={isTableTab}
          isSaving={isSaving}
          integrationId={integrationId}
          dataStreamId={dataStream.dataStreamId}
          onSelectTable={() => selectPipelineTab('table')}
          onSelectPipeline={() => selectPipelineTab('pipeline')}
        />
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isCloseConfirmVisible && (
          <CloseConfirmModal
            isSaving={isSaving}
            onCancel={() => setIsCloseConfirmVisible(false)}
            onConfirm={handleDiscardAndClose}
          />
        )}

        <FlyoutStatusCallouts
          isLoading={isLoading}
          isError={isError}
          errorMessage={error?.message}
          saveError={!isTableTab ? pipelineEditor.saveError : null}
        />

        {isTableVisible && (
          <TablePanel
            pageCount={pageCount}
            activeDocument={activeDocument}
            onPageClick={setActiveDocument}
            mappingEditor={mappingEditor}
            fieldTypeEditState={fieldTypeEditState}
          />
        )}

        {isEditorVisible && (
          <PipelineEditorPanel
            integrationId={integrationId}
            dataStreamId={dataStream.dataStreamId}
            value={pipelineEditor.pipelineText}
            onChange={(value) => {
              pipelineEditor.setPipelineText(value);
              pipelineEditor.clearSaveError();
            }}
          />
        )}
      </EuiFlyoutBody>
      {showFooter && (
        <EditPipelineFlyoutFooter
          {...footerState}
          isSaving={isSaving}
          onReset={handleFooterReset}
          onSave={handleFooterSave}
        />
      )}
    </EuiFlyout>
  );
};

EditPipelineFlyout.displayName = 'EditPipelineFlyout';
