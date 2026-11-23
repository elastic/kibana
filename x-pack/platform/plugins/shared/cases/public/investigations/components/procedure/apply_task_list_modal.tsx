/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import type { InvestigationRecord, TaskItem } from '../../../../common/investigations/types';
import {
  getHttpErrorMessage,
  useApplyRecordTaskList,
  useInvestigationToasts,
  useTaskLists,
} from '../../hooks';
import { ErrorState, LoadingState } from '../shared';
import * as i18n from './translations';

export interface ApplyTaskListModalProps {
  record: InvestigationRecord;
  tasks: readonly TaskItem[];
  onClose: () => void;
}

interface TaskListOptionData {
  description: string;
  taskCount: number;
  isApplied: boolean;
}

/**
 * Adds one of the space's task lists to the investigation. A list whose tasks are already on the
 * investigation is shown as applied and cannot be picked again.
 */
export const ApplyTaskListModal: React.FC<ApplyTaskListModalProps> = ({
  record,
  tasks,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId();
  const { showSuccess } = useInvestigationToasts();
  const taskListsQuery = useTaskLists();
  const apply = useApplyRecordTaskList(record.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appliedIds = useMemo(
    () => new Set(tasks.flatMap((task) => (task.task.template_id ? [task.task.template_id] : []))),
    [tasks]
  );

  const options = useMemo<Array<EuiSelectableOption<Partial<TaskListOptionData>>>>(
    () =>
      (taskListsQuery.data?.task_lists ?? []).map((list) => {
        const isApplied = appliedIds.has(list.id);
        return {
          key: list.id,
          label: list.name,
          disabled: isApplied,
          checked: selectedId === list.id ? 'on' : undefined,
          'data-test-subj': `investigationApplyTaskList-${list.id}`,
          data: {
            description: list.description,
            taskCount: list.tasks.reduce(
              (total, task) => total + 1 + (task.subtasks?.length ?? 0),
              0
            ),
            isApplied,
          },
        };
      }),
    [taskListsQuery.data, appliedIds, selectedId]
  );

  const handleApply = async () => {
    const selected = options.find((option) => option.key === selectedId);
    if (!selected?.key) {
      return;
    }
    setError(null);
    try {
      await apply.mutateAsync(selected.key);
      showSuccess(i18n.APPLY_SUCCESS(selected.label));
      onClose();
    } catch (applyError) {
      setError(getHttpErrorMessage(applyError));
    }
  };

  const renderList = () => {
    if (taskListsQuery.isLoading) {
      return <LoadingState label={i18n.EDITOR_LOADING} />;
    }
    if (taskListsQuery.isError) {
      return (
        <ErrorState
          title={i18n.EDITOR_LOAD_ERROR}
          error={taskListsQuery.error}
          onRetry={() => void taskListsQuery.refetch()}
        />
      );
    }
    if (options.length === 0) {
      return (
        <EuiText size="s" color="subdued" data-test-subj="investigationApplyTaskListEmpty">
          <p>{i18n.APPLY_NO_TASK_LISTS}</p>
        </EuiText>
      );
    }
    return (
      <EuiSelectable<EuiSelectableOption<Partial<TaskListOptionData>>>
        aria-label={i18n.APPLY_SELECT_LABEL}
        singleSelection="always"
        searchable
        searchProps={{
          compressed: true,
          placeholder: i18n.APPLY_SEARCH,
          'data-test-subj': 'investigationApplyTaskListSearch',
        }}
        options={options}
        listProps={{ bordered: true, rowHeight: 56 }}
        height={288}
        onChange={(next) => {
          setError(null);
          setSelectedId(next.find((option) => option.checked === 'on')?.key ?? null);
        }}
        renderOption={(option) => {
          // EuiSelectable hands the option's `data` to renderOption flattened into the option.
          const { description = '', taskCount = 0, isApplied = false } = option;
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{option.label}</strong>
                </EuiText>
                {description ? (
                  <EuiText size="xs" color="subdued">
                    {description}
                  </EuiText>
                ) : null}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.APPLY_TASK_COUNT(taskCount)}
                </EuiText>
              </EuiFlexItem>
              {isApplied ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{i18n.ALREADY_APPLIED}</EuiBadge>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          );
        }}
        data-test-subj="investigationApplyTaskListOptions"
      >
        {(list, search) => (
          <>
            {search}
            <EuiSpacer size="s" />
            {list}
          </>
        )}
      </EuiSelectable>
    );
  };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth={560}
      data-test-subj="investigationApplyTaskListModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.APPLY_PROCEDURE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p>{i18n.APPLY_SELECT_LABEL}</p>
        </EuiText>
        <EuiSpacer size="s" />
        {renderList()}
        {error ? (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={error}
              data-test-subj="investigationApplyTaskListError"
            />
          </>
        ) : null}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="investigationApplyTaskListCancel">
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isLoading={apply.isLoading}
          isDisabled={!selectedId}
          onClick={() => void handleApply()}
          data-test-subj="investigationApplyTaskListConfirm"
        >
          {i18n.APPLY_PROCEDURE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
ApplyTaskListModal.displayName = 'ApplyTaskListModal';
