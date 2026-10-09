/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiLoadingSpinner,
  EuiPagination,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import React, { useEffect, useRef } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { XJsonLang } from '@kbn/monaco';
import { useTelemetry } from '../../../telemetry_context';
import * as i18n from './translations';
import type { FlyoutFooterState } from './utils';
import type { useMappingEditor } from './mapping_editor';
import { MappingEditor } from './mapping_editor';
import type { FieldTypeEditState } from '../../../../../common';

export const FlyoutTabs = ({
  isTableTab,
  isSaving,
  integrationId,
  dataStreamId,
  onSelectTable,
  onSelectPipeline,
}: {
  isTableTab: boolean;
  isSaving: boolean;
  integrationId: string;
  dataStreamId: string;
  onSelectTable: () => void;
  onSelectPipeline: () => void;
}) => {
  const { reportEditPipelineTabOpened } = useTelemetry();
  return (
    <EuiTabs>
      <EuiTab
        id="editPipelineFlyoutTableTab"
        aria-controls="editPipelineFlyoutTablePanel"
        isSelected={isTableTab}
        disabled={isSaving}
        onClick={onSelectTable}
      >
        {i18n.EDIT_PIPELINE_FLYOUT.tableTab}
      </EuiTab>
      <EuiTab
        id="editPipelineFlyoutPipelineTab"
        aria-controls="editPipelineFlyoutPipelinePanel"
        isSelected={!isTableTab}
        disabled={isSaving}
        onClick={() => {
          reportEditPipelineTabOpened({ integrationId, dataStreamId });
          onSelectPipeline();
        }}
      >
        {i18n.EDIT_PIPELINE_FLYOUT.pipelineTab}
      </EuiTab>
    </EuiTabs>
  );
};

export const CloseConfirmModal = ({
  isSaving,
  onCancel,
  onConfirm,
}: {
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <EuiConfirmModal
    title={i18n.EDIT_PIPELINE_FLYOUT.closeConfirmTitle}
    aria-label={i18n.EDIT_PIPELINE_FLYOUT.closeConfirmTitle}
    onCancel={() => {
      if (!isSaving) onCancel();
    }}
    onConfirm={onConfirm}
    isLoading={isSaving}
    cancelButtonText={i18n.EDIT_PIPELINE_FLYOUT.closeConfirmCancel}
    confirmButtonText={i18n.EDIT_PIPELINE_FLYOUT.closeConfirmDiscard}
    defaultFocusedButton="confirm"
    buttonColor="danger"
  >
    <p>{i18n.EDIT_PIPELINE_FLYOUT.closeConfirmBody}</p>
  </EuiConfirmModal>
);

export const FlyoutLoading = () => (
  <EuiFlexGroup justifyContent="center" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="xl" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const TablePanel = ({
  pageCount,
  activeDocument,
  onPageClick,
  mappingEditor,
  fieldTypeEditState,
}: {
  pageCount: number;
  activeDocument: number;
  onPageClick: (page: number) => void;
  mappingEditor: ReturnType<typeof useMappingEditor>;
  fieldTypeEditState: FieldTypeEditState;
}) => (
  <div
    id="editPipelineFlyoutTablePanel"
    role="tabpanel"
    aria-labelledby="editPipelineFlyoutTableTab"
  >
    {pageCount > 0 && (
      <>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText>{i18n.EDIT_PIPELINE_FLYOUT.documents}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPagination
              aria-label={i18n.EDIT_PIPELINE_FLYOUT.paginationAriaLabel}
              onPageClick={onPageClick}
              activePage={activeDocument}
              pageCount={pageCount}
              compressed
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
      </>
    )}
    <MappingEditor editor={mappingEditor} editState={fieldTypeEditState} />
  </div>
);

export const FlyoutStatusCallouts = ({
  isLoading,
  isError,
  errorMessage,
  saveError,
}: {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  saveError: string | null;
}) => {
  if (isLoading) return <FlyoutLoading />;
  if (isError) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.EDIT_PIPELINE_FLYOUT.errorTitle}
        color="danger"
        iconType="error"
      >
        <p>{errorMessage ?? i18n.EDIT_PIPELINE_FLYOUT.errorMessage}</p>
      </EuiCallOut>
    );
  }
  if (saveError) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.EDIT_PIPELINE_FLYOUT.saveErrorTitle}
        color="danger"
        iconType="error"
      >
        <p>{saveError}</p>
      </EuiCallOut>
    );
  }
  return null;
};

export const PipelineEditorPanel = ({
  integrationId,
  dataStreamId,
  value,
  onChange,
}: {
  integrationId: string;
  dataStreamId: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const { reportCodeEditorCopyClicked } = useTelemetry();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleClick = (event: Event) => {
      const target = event.target as HTMLElement;
      if (
        target.closest('.euiCodeBlock__copyButton') ||
        target.getAttribute('aria-label')?.toLowerCase().includes('copy')
      ) {
        reportCodeEditorCopyClicked({ integrationId, dataStreamId });
      }
    };
    const stopEnterPropagation = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.stopPropagation();
      }
    };
    container.addEventListener('click', handleClick);
    container.addEventListener('keydown', stopEnterPropagation);
    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('keydown', stopEnterPropagation);
    };
  }, [dataStreamId, integrationId, reportCodeEditorCopyClicked]);

  return (
    <div
      id="editPipelineFlyoutPipelinePanel"
      role="tabpanel"
      aria-labelledby="editPipelineFlyoutPipelineTab"
      ref={containerRef}
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
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export const EditPipelineFlyoutFooter = ({
  isSaving,
  isResetDisabled,
  isSaveDisabled,
  saveTestSubj,
  warning,
  onReset,
  onSave,
}: FlyoutFooterState & {
  isSaving: boolean;
  onReset: () => void;
  onSave: () => void;
}) => (
  <EuiFlyoutFooter data-test-subj="mappingEditorFooter">
    {warning && (
      <>
        <EuiCallOut
          announceOnMount
          title={warning.title}
          color="warning"
          iconType="warning"
          data-test-subj="editPipelineFlyoutOtherTabWarning"
        >
          <p>{warning.description}</p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    )}
    <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
      <EuiButtonEmpty onClick={onReset} isDisabled={isResetDisabled}>
        {i18n.EDIT_PIPELINE_FLYOUT.resetButton}
      </EuiButtonEmpty>
      <EuiButton
        fill
        onClick={onSave}
        isLoading={isSaving}
        isDisabled={isSaveDisabled}
        data-test-subj={saveTestSubj}
      >
        {i18n.EDIT_PIPELINE_FLYOUT.saveButton}
      </EuiButton>
    </EuiFlexGroup>
  </EuiFlyoutFooter>
);
