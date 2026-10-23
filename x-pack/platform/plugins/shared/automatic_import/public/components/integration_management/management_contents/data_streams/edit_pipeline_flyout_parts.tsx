/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiLink,
  EuiLoadingSpinner,
  EuiPagination,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CodeEditor, XJSON_LANG_ID, monaco } from '@kbn/code-editor';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { useTelemetry } from '../../../telemetry_context';
import * as i18n from './translations';
import type { FlyoutFooterState } from './utils';
import type { MappingEditorState } from './mapping_editor';
import { MappingEditor } from './mapping_editor';
import type { DataStreamEditState, PipelineErrors } from '../../../../../common';
import { getFieldTypeProcessorTag } from '../../../../../common';

const PIPELINE_MARKER_OWNER = 'automaticImportPipeline';

/** A field type error to show next to the pipeline. */
export interface PipelineFieldError {
  name: string;
  message: string;
}

interface PipelineProblem {
  key: string;
  message: string;
  line?: number;
}

export const FlyoutTabs = ({
  isTableTab,
  isBusy,
  integrationId,
  dataStreamId,
  onSelectTable,
  onSelectPipeline,
}: {
  isTableTab: boolean;
  isBusy: boolean;
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
        disabled={isBusy}
        onClick={() => {
          if (!isTableTab) onSelectTable();
        }}
      >
        {i18n.EDIT_PIPELINE_FLYOUT.tableTab}
      </EuiTab>
      <EuiTab
        id="editPipelineFlyoutPipelineTab"
        aria-controls="editPipelineFlyoutPipelinePanel"
        isSelected={!isTableTab}
        disabled={isBusy}
        onClick={() => {
          if (!isTableTab) return;
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

export const BreakingChangesConfirmModal = ({
  fieldNames,
  isSaving,
  onCancel,
  onConfirm,
}: {
  fieldNames: string[];
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <EuiConfirmModal
    title={i18n.EDIT_PIPELINE_FLYOUT.breakingChangesConfirmTitle}
    aria-label={i18n.EDIT_PIPELINE_FLYOUT.breakingChangesConfirmTitle}
    onCancel={() => {
      if (!isSaving) onCancel();
    }}
    onConfirm={onConfirm}
    isLoading={isSaving}
    cancelButtonText={i18n.EDIT_PIPELINE_FLYOUT.breakingChangesConfirmCancel}
    confirmButtonText={i18n.EDIT_PIPELINE_FLYOUT.breakingChangesConfirmSave}
    defaultFocusedButton="cancel"
    buttonColor="warning"
    data-test-subj="editPipelineFlyoutBreakingChangesModal"
  >
    <p>
      {i18n.EDIT_PIPELINE_FLYOUT.breakingChangesDescription(
        i18n.EDIT_PIPELINE_FLYOUT.breakingChangesFieldList(fieldNames)
      )}
    </p>
  </EuiConfirmModal>
);

const FlyoutLoading = () => (
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
  editState,
  droppedFieldTypes,
}: {
  pageCount: number;
  activeDocument: number;
  onPageClick: (page: number) => void;
  mappingEditor: MappingEditorState;
  editState: DataStreamEditState;
  droppedFieldTypes: string[];
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
    {droppedFieldTypes.length > 0 && (
      <>
        <KbnWarningCallout
          announceOnMount
          title={i18n.EDIT_PIPELINE_FLYOUT.droppedFieldTypesTitle}
          size="s"
          data-test-subj="editPipelineFlyoutDroppedFieldTypes"
        >
          <p>
            {i18n.EDIT_PIPELINE_FLYOUT.droppedFieldTypesDescription(droppedFieldTypes.join(', '))}
          </p>
        </KbnWarningCallout>
        <EuiSpacer size="m" />
      </>
    )}
    <MappingEditor editor={mappingEditor} editState={editState} />
  </div>
);

const ProblemList = ({
  problems,
  onGoToLine,
}: {
  problems: PipelineProblem[];
  onGoToLine?: (line: number) => void;
}) => (
  <ul>
    {problems.map(({ key, message, line }) => (
      <li key={key}>
        {message}
        {onGoToLine && line !== undefined && (
          <>
            {' '}
            <EuiLink onClick={() => onGoToLine(line)} data-test-subj="editPipelineFlyoutGoToLine">
              {i18n.EDIT_PIPELINE_FLYOUT.goToLine(line)}
            </EuiLink>
          </>
        )}
      </li>
    ))}
  </ul>
);

const PipelineErrorsCallout = ({
  pipelineErrors,
  problems,
  onGoToLine,
}: {
  pipelineErrors: PipelineErrors;
  problems: PipelineProblem[];
  onGoToLine?: (line: number) => void;
}) => (
  <>
    <KbnDangerCallout
      announceOnMount
      title={i18n.EDIT_PIPELINE_FLYOUT.pipelineRegressionTitle}
      data-test-subj="editPipelineFlyoutPipelineErrors"
    >
      <p>
        {i18n.EDIT_PIPELINE_FLYOUT.pipelineRegressionDescription(
          pipelineErrors.failed_samples,
          pipelineErrors.baseline_failed_samples
        )}
      </p>
      <ProblemList problems={problems} onGoToLine={onGoToLine} />
    </KbnDangerCallout>
    <EuiSpacer size="m" />
  </>
);

const toErrorGroupProblems = (
  pipelineErrors: PipelineErrors,
  findLine: (tag: string) => number | undefined = () => undefined
): PipelineProblem[] =>
  pipelineErrors.error_groups.map(({ error, count, processor_tag: processorTag }) => ({
    key: error,
    message: i18n.EDIT_PIPELINE_FLYOUT.pipelineErrorGroup(error, count),
    line: processorTag ? findLine(processorTag) : undefined,
  }));

export const FlyoutStatusCallouts = ({
  isLoading,
  isError,
  errorMessage,
  pipelineErrors,
}: {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  pipelineErrors?: PipelineErrors;
}) => {
  if (isLoading) return <FlyoutLoading />;
  if (isError) {
    return (
      <KbnDangerCallout announceOnMount title={i18n.EDIT_PIPELINE_FLYOUT.errorTitle}>
        <p>{errorMessage ?? i18n.EDIT_PIPELINE_FLYOUT.errorMessage}</p>
      </KbnDangerCallout>
    );
  }
  if (pipelineErrors) {
    return (
      <PipelineErrorsCallout
        pipelineErrors={pipelineErrors}
        problems={toErrorGroupProblems(pipelineErrors)}
      />
    );
  }
  return null;
};

/** Returns the 1-based number of the first line that has every part, or undefined. */
const findLineWith = (lines: readonly string[], ...parts: string[]): number | undefined => {
  const index = lines.findIndex((line) => parts.every((part) => line.includes(part)));
  return index === -1 ? undefined : index + 1;
};

const findTagLine = (lines: readonly string[], tag: string): number | undefined =>
  findLineWith(lines, '"tag"', JSON.stringify(tag));

const PipelineProblemCallouts = ({
  text,
  pipelineError,
  pipelineErrors,
  fieldErrors,
  removedApprovedFields,
  isChecking,
  onGoToLine,
  onProblemLinesChange,
}: {
  text: string;
  pipelineError: string | null;
  pipelineErrors?: PipelineErrors;
  fieldErrors: PipelineFieldError[];
  removedApprovedFields: string[];
  isChecking: boolean;
  onGoToLine: (line: number) => void;
  onProblemLinesChange: (problems: PipelineProblem[]) => void;
}) => {
  const { errorGroupProblems, fieldProblems } = useMemo(() => {
    const lines = text.split('\n');
    return {
      errorGroupProblems: pipelineErrors
        ? toErrorGroupProblems(pipelineErrors, (tag) => findTagLine(lines, tag))
        : [],
      fieldProblems: fieldErrors.map(({ name, message }) => ({
        key: name,
        message: `${name}: ${message}`,
        line:
          findTagLine(lines, getFieldTypeProcessorTag(name)) ??
          findLineWith(lines, JSON.stringify(name)),
      })),
    };
  }, [fieldErrors, pipelineErrors, text]);

  const shownProblems = useMemo(() => {
    if (pipelineError) return [];
    return pipelineErrors ? errorGroupProblems : fieldProblems;
  }, [errorGroupProblems, fieldProblems, pipelineError, pipelineErrors]);

  useEffect(() => {
    onProblemLinesChange(shownProblems);
  }, [onProblemLinesChange, shownProblems]);

  return (
    <>
      {isChecking && (
        <>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="editPipelineFlyoutChecking">
                {i18n.EDIT_PIPELINE_FLYOUT.checkingPipeline}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}
      {pipelineError && (
        <>
          <KbnDangerCallout
            announceOnMount
            size="s"
            title={i18n.EDIT_PIPELINE_FLYOUT.saveErrorTitle}
            data-test-subj="editPipelineFlyoutApplyError"
          >
            <p>{pipelineError}</p>
          </KbnDangerCallout>
          <EuiSpacer size="m" />
        </>
      )}
      {!pipelineError && pipelineErrors && (
        <PipelineErrorsCallout
          pipelineErrors={pipelineErrors}
          problems={errorGroupProblems}
          onGoToLine={onGoToLine}
        />
      )}
      {!pipelineError && !pipelineErrors && fieldProblems.length > 0 && (
        <>
          <KbnDangerCallout
            announceOnMount
            size="s"
            title={i18n.EDIT_PIPELINE_FLYOUT.fieldErrorsTitle}
            data-test-subj="editPipelineFlyoutFieldErrors"
          >
            <ProblemList problems={fieldProblems} onGoToLine={onGoToLine} />
          </KbnDangerCallout>
          <EuiSpacer size="m" />
        </>
      )}
      {removedApprovedFields.length > 0 && (
        <>
          <KbnWarningCallout
            announceOnMount
            size="s"
            title={i18n.EDIT_PIPELINE_FLYOUT.breakingChangesTitle}
            data-test-subj="editPipelineFlyoutBreakingChanges"
          >
            <p>
              {i18n.EDIT_PIPELINE_FLYOUT.breakingChangesDescription(
                i18n.EDIT_PIPELINE_FLYOUT.breakingChangesFieldList(removedApprovedFields)
              )}
            </p>
          </KbnWarningCallout>
          <EuiSpacer size="m" />
        </>
      )}
    </>
  );
};

const useProblemMarkers = () => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>();
  const [problems, setProblems] = useState<PipelineProblem[]>([]);

  useEffect(() => {
    const model = editor?.getModel();
    if (!model) return;
    const lineCount = model.getLineCount();
    monaco.editor.setModelMarkers(
      model,
      PIPELINE_MARKER_OWNER,
      problems.flatMap(({ message, line }) =>
        line !== undefined && line <= lineCount
          ? [
              {
                severity: monaco.MarkerSeverity.Error,
                message,
                startLineNumber: line,
                startColumn: model.getLineFirstNonWhitespaceColumn(line),
                endLineNumber: line,
                endColumn: model.getLineMaxColumn(line),
              },
            ]
          : []
      )
    );
  }, [editor, problems]);

  useEffect(() => {
    const model = editor?.getModel();
    return () => {
      if (model && !model.isDisposed()) {
        monaco.editor.setModelMarkers(model, PIPELINE_MARKER_OWNER, []);
      }
    };
  }, [editor]);

  const goToLine = useCallback(
    (line: number) => {
      if (!editor) return;
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column: 1 });
      editor.focus();
    },
    [editor]
  );

  return { setEditor, setProblems, goToLine };
};

const PIPELINE_EDITOR_HEIGHT = 'calc(100vh - 280px)';

export const PipelineEditorPanel = ({
  integrationId,
  dataStreamId,
  value,
  onChange,
  readOnly,
  isBusy,
  notice,
  pipelineError,
  pipelineErrors,
  fieldErrors,
  removedApprovedFields,
  isChecking,
}: {
  integrationId: string;
  dataStreamId: string;
  value: string;
  onChange: (value: string) => void;
  /** Shows the pipeline as a code block instead of an editor. */
  readOnly: boolean;
  isBusy: boolean;
  notice?: ReactNode;
  pipelineError: string | null;
  pipelineErrors?: PipelineErrors;
  fieldErrors: PipelineFieldError[];
  removedApprovedFields: string[];
  isChecking: boolean;
}) => {
  const { reportCodeEditorCopyClicked } = useTelemetry();
  const containerRef = useRef<HTMLDivElement>(null);
  const { setEditor, setProblems, goToLine } = useProblemMarkers();

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
      {notice && (
        <>
          {notice}
          <EuiSpacer size="m" />
        </>
      )}
      <PipelineProblemCallouts
        text={value}
        pipelineError={pipelineError}
        pipelineErrors={pipelineErrors}
        fieldErrors={fieldErrors}
        removedApprovedFields={removedApprovedFields}
        isChecking={isChecking}
        onGoToLine={goToLine}
        onProblemLinesChange={setProblems}
      />
      {readOnly ? (
        <EuiCodeBlock
          language="json"
          isCopyable
          fontSize="s"
          paddingSize="m"
          overflowHeight={PIPELINE_EDITOR_HEIGHT}
          data-test-subj="editPipelineFlyoutReadOnlyPipeline"
        >
          {value}
        </EuiCodeBlock>
      ) : (
        <CodeEditor
          isCopyable
          enableFindAction
          languageId={XJSON_LANG_ID}
          height={PIPELINE_EDITOR_HEIGHT}
          width="100%"
          options={{
            readOnly: isBusy,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
          value={value}
          onChange={onChange}
          editorDidMount={setEditor}
        />
      )}
    </div>
  );
};

export const EditPipelineFlyoutFooter = ({
  isSaving,
  isResetDisabled,
  isSaveDisabled,
  saveTestSubj,
  onReset,
  onSave,
}: FlyoutFooterState & {
  isSaving: boolean;
  onReset: () => void;
  onSave: () => void;
}) => (
  <EuiFlyoutFooter data-test-subj="mappingEditorFooter">
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
