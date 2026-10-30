/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody, EuiTitle, EuiSpacer } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { DataStreamResponse, DataStreamEditState } from '../../../../../common';
import { useGetDataStreamResults } from '../../../../common';
import { useUIState } from '../../contexts';
import { formatServerError, useMappingEditor } from './mapping_editor';
import {
  BreakingChangesConfirmModal,
  CloseConfirmModal,
  EditPipelineFlyoutFooter,
  FlyoutStatusCallouts,
  FlyoutTabs,
  PipelineEditorPanel,
  TablePanel,
} from './edit_pipeline_flyout_parts';
import * as i18n from './translations';
import { useDataStreamDraft } from './use_data_stream_draft';
import { getFlyoutFooterState } from './utils';

interface EditPipelineFlyoutProps {
  integrationId: string;
  dataStream: DataStreamResponse;
  onClose: () => void;
  editState: DataStreamEditState;
}

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
  editState,
}: EditPipelineFlyoutProps) => {
  const isEditable = editState === 'editable';
  const [isCloseConfirmVisible, setIsCloseConfirmVisible] = useState(false);
  const { selectedPipelineTab, selectPipelineTab } = useUIState();
  const { data, isLoading, isError, error } = useGetDataStreamResults(
    integrationId,
    dataStream.dataStreamId
  );
  const draft = useDataStreamDraft({
    integrationId,
    dataStreamId: dataStream.dataStreamId,
    data,
    isEditable,
  });
  const { activeDocument, setActiveDocument, pageCount } = usePagedDocuments(
    draft.documents.length
  );
  const mappingEditor = useMappingEditor({
    dataStreamId: dataStream.dataStreamId,
    fieldMappings: draft.fieldMappings,
    savedFieldMappings: draft.savedFieldMappings,
    fieldTypeOverrides: draft.fieldTypeOverrides,
    approvedFieldTypes: draft.approvedFieldTypes,
    isDataStreamApproved: draft.isDataStreamApproved,
    documents: draft.documents,
    activeDocument,
    pendingTypes: draft.pendingTypes,
    serverErrors: draft.fieldErrors,
    stageType: draft.stageType,
  });

  const isBusy = draft.isSaving || draft.isSyncing;
  const isTableTab = selectedPipelineTab === 'table';
  const isTableVisible = !isLoading && !isError && isTableTab;
  const isEditorVisible = !isLoading && !isError && !isTableTab && Boolean(data?.ingest_pipeline);
  const footerState = getFlyoutFooterState({
    isTableTab,
    isDirty: draft.isDirty,
    isBusy,
    pipelineText: draft.pipelineText,
  });

  const pipelineFieldErrors = useMemo(
    () =>
      Object.values(draft.fieldErrors).map((fieldError) => {
        const type =
          draft.pendingTypes[fieldError.name] ??
          draft.fieldMappings?.find(({ name }) => name === fieldError.name)?.type ??
          '';
        return { name: fieldError.name, message: formatServerError(type, fieldError) };
      }),
    [draft.fieldErrors, draft.fieldMappings, draft.pendingTypes]
  );

  const handleFlyoutClose = useCallback(() => {
    if (isBusy) return;
    if (draft.isDirty) {
      setIsCloseConfirmVisible(true);
      return;
    }
    onClose();
  }, [draft.isDirty, isBusy, onClose]);

  const handleSelectTable = useCallback(async () => {
    if (await draft.syncToTable()) selectPipelineTab('table');
  }, [draft, selectPipelineTab]);

  const handleSelectPipeline = useCallback(() => {
    draft.syncToPipeline();
    selectPipelineTab('pipeline');
  }, [draft, selectPipelineTab]);

  const handleFooterSave = useCallback(async () => {
    if (await draft.save(!isTableTab)) onClose();
  }, [draft, isTableTab, onClose]);

  const handleConfirmBreakingChanges = useCallback(async () => {
    if (await draft.save(!isTableTab, true)) onClose();
  }, [draft, isTableTab, onClose]);

  const handleDiscardAndClose = useCallback(() => {
    if (isBusy) return;
    setIsCloseConfirmVisible(false);
    onClose();
  }, [isBusy, onClose]);

  const showFooter = isEditable && (isTableVisible || isEditorVisible);
  const pipelineNotice = isEditable ? undefined : (
    <KbnInfoCallout
      size="s"
      title={i18n.EDIT_PIPELINE_FLYOUT.notEditableNotice}
      data-test-subj="editPipelineFlyoutReadOnlyNotice"
    />
  );

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
          isBusy={isBusy}
          integrationId={integrationId}
          dataStreamId={dataStream.dataStreamId}
          onSelectTable={handleSelectTable}
          onSelectPipeline={handleSelectPipeline}
        />
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isCloseConfirmVisible && (
          <CloseConfirmModal
            isSaving={isBusy}
            onCancel={() => setIsCloseConfirmVisible(false)}
            onConfirm={handleDiscardAndClose}
          />
        )}

        {draft.pendingBreakingChanges.length > 0 && (
          <BreakingChangesConfirmModal
            fieldNames={draft.pendingBreakingChanges}
            isSaving={draft.isSaving}
            onCancel={draft.cancelBreakingChanges}
            onConfirm={handleConfirmBreakingChanges}
          />
        )}

        <FlyoutStatusCallouts
          isLoading={isLoading}
          isError={isError}
          errorMessage={error?.message}
          pipelineErrors={isTableTab ? draft.pipelineErrors : undefined}
        />

        {isTableVisible && (
          <TablePanel
            pageCount={pageCount}
            activeDocument={activeDocument}
            onPageClick={setActiveDocument}
            mappingEditor={mappingEditor}
            editState={editState}
            droppedFieldTypes={draft.droppedFieldTypes}
          />
        )}

        {isEditorVisible && (
          <PipelineEditorPanel
            integrationId={integrationId}
            dataStreamId={dataStream.dataStreamId}
            value={draft.pipelineText}
            onChange={draft.setPipelineText}
            readOnly={!isEditable}
            isBusy={isBusy}
            notice={pipelineNotice}
            pipelineError={draft.pipelineError}
            pipelineErrors={draft.pipelineErrors}
            fieldErrors={pipelineFieldErrors}
            removedApprovedFields={draft.removedApprovedFields}
            isChecking={draft.isChecking}
          />
        )}
      </EuiFlyoutBody>
      {showFooter && (
        <EditPipelineFlyoutFooter
          {...footerState}
          isSaving={draft.isSaving}
          onReset={draft.reset}
          onSave={handleFooterSave}
        />
      )}
    </EuiFlyout>
  );
};

EditPipelineFlyout.displayName = 'EditPipelineFlyout';
