/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { InvestigationRecord, TaskItem } from '../../../../common/investigations/types';
import {
  useApplyProcedure,
  useInvestigationToasts,
  useInvestigationTypes,
  useProcedureTemplates,
  useUpdateProcedureTemplate,
} from '../../hooks';
import { ICONS } from '../../icons';
import { ConfirmModal, ErrorState, LoadingState } from '../shared';
import { isTaskFinished } from './procedure_helpers';
import { TemplateTaskRow } from './template_task_row';
import {
  MAX_TEMPLATE_TASKS,
  createBlankDraft,
  createDraftKey,
  serializeDraft,
  toDraft,
  toTemplateTasks,
  validateDraft,
} from './template_draft';
import type { DraftTask } from './template_draft';
import * as i18n from './translations';

export interface TemplateEditorProps {
  record: InvestigationRecord;
  tasks: readonly TaskItem[];
  onClose: () => void;
}

type PendingAction = 'discard-close' | 'discard-type' | 'apply';

export const TemplateEditor: React.FC<TemplateEditorProps> = ({ record, tasks, onClose }) => {
  const flyoutTitleId = useGeneratedHtmlId();
  const { showSuccess } = useInvestigationToasts();
  const templatesQuery = useProcedureTemplates();
  const typesQuery = useInvestigationTypes();
  const saveTemplate = useUpdateProcedureTemplate();
  const applyProcedure = useApplyProcedure(record.id);

  const counter = useRef(0);
  const nextKey = useCallback(() => {
    counter.current += 1;
    return createDraftKey(counter.current);
  }, []);

  const [type, setType] = useState(record.investigation_type);
  const [loadedType, setLoadedType] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftTask[]>([]);
  const [baseline, setBaseline] = useState('[]');
  const [showErrors, setShowErrors] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [pendingType, setPendingType] = useState<string | null>(null);

  const templates = templatesQuery.data?.templates;
  const typeOptions = useMemo(() => {
    const names = new Set<string>([record.investigation_type]);
    templates?.forEach((template) => names.add(template.type));
    typesQuery.data?.types.forEach((investigationType) => names.add(investigationType.name));
    return Array.from(names).filter((name) => name.length > 0);
  }, [record.investigation_type, templates, typesQuery.data]);

  // Load the draft for the chosen type once, not on every refetch of the templates.
  useEffect(() => {
    if (!templates || loadedType === type) {
      return;
    }
    const template = templates.find((candidate) => candidate.type === type);
    const loaded = toDraft(template?.tasks ?? [], nextKey);
    setDraft(loaded);
    setBaseline(serializeDraft(loaded));
    setLoadedType(type);
    setShowErrors(false);
  }, [templates, type, loadedType, nextKey]);

  const isDirty = serializeDraft(draft) !== baseline;
  const errors = useMemo(() => validateDraft(draft), [draft]);
  const hasErrors = Object.keys(errors).length > 0 || draft.length > MAX_TEMPLATE_TASKS;
  const unfinishedCount = tasks.filter((task) => !isTaskFinished(task)).length;
  const isBusy = saveTemplate.isLoading || applyProcedure.isLoading;

  const updateTask = (key: string, patch: Partial<DraftTask>) =>
    setDraft((current) => current.map((task) => (task.key === key ? { ...task, ...patch } : task)));
  const moveTask = (key: string, direction: -1 | 1) =>
    setDraft((current) => {
      const index = current.findIndex((task) => task.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const removeTask = (key: string) =>
    setDraft((current) =>
      current
        .filter((task) => task.key !== key)
        .map((task) => (task.afterKey === key ? { ...task, afterKey: '' } : task))
    );
  const addTask = () =>
    setDraft((current) => [...current, createBlankDraft(nextKey(), i18n.EDITOR_NEW_TASK)]);

  const requestClose = () => (isDirty ? setPending('discard-close') : onClose());
  const requestTypeChange = (next: string) => {
    if (next === type) {
      return;
    }
    if (isDirty) {
      setPendingType(next);
      setPending('discard-type');
      return;
    }
    setType(next);
  };

  const save = async (): Promise<boolean> => {
    try {
      await saveTemplate.mutateAsync({ type, tasks: toTemplateTasks(draft) });
      setBaseline(serializeDraft(draft));
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    setShowErrors(true);
    if (hasErrors) {
      return;
    }
    if (await save()) {
      onClose();
    }
  };

  const applySaved = async () => {
    setPending(null);
    if (!(await save())) {
      return;
    }
    try {
      await applyProcedure.mutateAsync({ type, replace: true });
      showSuccess(i18n.EDITOR_SAVED_APPLIED(type));
      onClose();
    } catch {
      // useApplyProcedure already shows the error.
    }
  };

  const handleSaveAndApply = () => {
    setShowErrors(true);
    if (hasErrors) {
      return;
    }
    if (unfinishedCount > 0) {
      setPending('apply');
      return;
    }
    void applySaved();
  };

  const renderBody = () => {
    if (templatesQuery.isLoading) {
      return <LoadingState label={i18n.EDITOR_LOADING} />;
    }
    if (templatesQuery.error || !templates) {
      return (
        <ErrorState
          title={i18n.EDITOR_LOAD_ERROR}
          error={templatesQuery.error}
          onRetry={() => void templatesQuery.refetch()}
        />
      );
    }
    return (
      <>
        {draft.length === 0 ? (
          <EuiText size="s" color="subdued" data-test-subj="investigationTemplateEmpty">
            <p>{i18n.EDITOR_NO_TASKS}</p>
          </EuiText>
        ) : null}
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
          {draft.map((task, index) => (
            <EuiFlexItem grow={false} key={task.key}>
              <TemplateTaskRow
                draft={task}
                index={index}
                total={draft.length}
                afterOptions={draft}
                errors={showErrors ? errors[task.key] : undefined}
                onChange={updateTask}
                onMove={moveTask}
                onRemove={removeTask}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiButtonEmpty
          size="s"
          iconType={ICONS.add}
          isDisabled={draft.length >= MAX_TEMPLATE_TASKS}
          onClick={addTask}
          data-test-subj="investigationTemplateAddTask"
        >
          {i18n.EDITOR_ADD_TASK}
        </EuiButtonEmpty>
        {draft.length > MAX_TEMPLATE_TASKS ? (
          <EuiText size="xs" color="danger">
            {i18n.EDITOR_TOO_MANY}
          </EuiText>
        ) : null}
        {showErrors && hasErrors ? (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={i18n.EDITOR_FIX_ERRORS}
              data-test-subj="investigationTemplateErrors"
            />
          </>
        ) : null}
      </>
    );
  };

  return (
    <>
      <EuiFlyout
        onClose={requestClose}
        size="l"
        ownFocus
        aria-labelledby={flyoutTitleId}
        data-test-subj="investigationTemplateEditor"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={flyoutTitleId}>{i18n.EDITOR_TITLE}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="m" alignItems="center" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFormRow label={i18n.EDITOR_TYPE_LABEL} display="rowCompressed">
                <EuiSelect
                  compressed
                  value={type}
                  options={typeOptions.map((name) => ({ value: name, text: name }))}
                  onChange={(event) => requestTypeChange(event.target.value)}
                  data-test-subj="investigationTemplateType"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {i18n.EDITOR_HINT}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={requestClose} data-test-subj="investigationTemplateCancel">
                {i18n.EDITOR_CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    isLoading={saveTemplate.isLoading && pending !== 'apply'}
                    isDisabled={isBusy || !templates}
                    onClick={() => void handleSave()}
                    data-test-subj="investigationTemplateSave"
                  >
                    {i18n.EDITOR_SAVE}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    isLoading={applyProcedure.isLoading}
                    isDisabled={isBusy || !templates}
                    onClick={handleSaveAndApply}
                    data-test-subj="investigationTemplateSaveApply"
                  >
                    {i18n.EDITOR_SAVE_APPLY}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
      {pending === 'discard-close' || pending === 'discard-type' ? (
        <ConfirmModal
          title={i18n.EDITOR_DISCARD_TITLE}
          body={<p>{i18n.EDITOR_DISCARD_BODY}</p>}
          confirmLabel={i18n.EDITOR_DISCARD_CONFIRM}
          cancelLabel={i18n.EDITOR_KEEP_EDITING}
          destructive
          onConfirm={() => {
            if (pending === 'discard-type' && pendingType) {
              setType(pendingType);
              setPendingType(null);
              setPending(null);
              return;
            }
            setPending(null);
            onClose();
          }}
          onCancel={() => {
            setPending(null);
            setPendingType(null);
          }}
          data-test-subj="investigationTemplateDiscardModal"
        />
      ) : null}
      {pending === 'apply' ? (
        <ConfirmModal
          title={i18n.EDITOR_APPLY_TITLE}
          body={<p>{i18n.EDITOR_APPLY_BODY(type, unfinishedCount)}</p>}
          confirmLabel={i18n.EDITOR_APPLY_CONFIRM}
          destructive
          onConfirm={() => void applySaved()}
          onCancel={() => setPending(null)}
          data-test-subj="investigationTemplateApplyModal"
        />
      ) : null}
    </>
  );
};
TemplateEditor.displayName = 'TemplateEditor';
