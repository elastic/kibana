/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import { MAX_TASK_LISTS_PER_SPACE } from '../../../../common/investigations/constants';
import type { TaskList } from '../../../../common/investigations/types';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import {
  useDeleteTaskList,
  useInvestigationToasts,
  useInvestigationTypes,
  useInvestigationsNavigation,
  useTaskLists,
} from '../../hooks';
import { ICONS } from '../../icons';
import { ConfirmModal, EmptyState, ErrorState, LoadingState, RelativeTime } from '../shared';
import { NEW_TASK_LIST_PATH, TASK_LISTS_PATH, getTaskListPath } from './paths';
import { TaskListEditor } from './task_list_editor';
import * as i18n from './translations';

export interface TaskListsTabProps {
  /** Opens the editor on this task list (the `/settings/task-lists/:id` route). */
  editTaskListId?: string;
  /** Opens the editor on a new task list (the `/settings/task-lists/new` route). */
  isAdding?: boolean;
}

/** A list's task count: its tasks and their sub-tasks. */
const countTasks = (taskList: TaskList): number =>
  taskList.tasks.reduce((total, task) => total + 1 + (task.subtasks?.length ?? 0), 0);

/**
 * The reusable task lists of the space: add, edit and delete them here. Templates reference them
 * from the Investigation templates tab.
 */
export const TaskListsTab: React.FC<TaskListsTabProps> = ({ editTaskListId, isAdding }) => {
  const { permissions } = useCasesContext();
  const { navigate, getHref } = useInvestigationsNavigation();
  const { showSuccess, showError } = useInvestigationToasts();
  const taskListsQuery = useTaskLists();
  const typesQuery = useInvestigationTypes();
  const deleteTaskList = useDeleteTaskList();
  const [taskListToDelete, setTaskListToDelete] = useState<TaskList | null>(null);

  const canManage = permissions.settings;
  const taskLists = useMemo(() => taskListsQuery.data?.task_lists ?? [], [taskListsQuery.data]);
  const isAtLimit = taskLists.length >= MAX_TASK_LISTS_PER_SPACE;

  const usedBy = useMemo(() => {
    const map = new Map<string, string[]>();
    (typesQuery.data?.types ?? []).forEach((type) => {
      type.task_list_ids.forEach((id) => map.set(id, [...(map.get(id) ?? []), type.name]));
    });
    return map;
  }, [typesQuery.data]);

  const handleDelete = () => {
    if (!taskListToDelete) {
      return;
    }
    const target = taskListToDelete;
    deleteTaskList.mutate(target.id, {
      onSuccess: () => {
        showSuccess(i18n.TASK_LIST_DELETED(target.name));
        setTaskListToDelete(null);
      },
      onError: (error) => {
        showError(error, i18n.TASK_LIST_DELETE_ERROR);
        setTaskListToDelete(null);
      },
    });
  };

  const columns: Array<EuiBasicTableColumn<TaskList>> = [
    {
      field: 'name',
      name: i18n.COLUMN_NAME,
      width: '200px',
      render: (name: string, taskList) => (
        <EuiLink
          href={getHref(getTaskListPath(taskList.id))}
          onClick={(event: React.MouseEvent) => {
            event.preventDefault();
            navigate(getTaskListPath(taskList.id));
          }}
          data-test-subj={`investigationTaskListName-${taskList.id}`}
        >
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'description',
      name: i18n.COLUMN_DESCRIPTION,
      render: (description: string) =>
        description ? (
          <EuiText size="s" css={clampStyles}>
            {description}
          </EuiText>
        ) : (
          <EuiText size="s" color="subdued">
            {i18n.NO_DESCRIPTION}
          </EuiText>
        ),
    },
    {
      field: 'tags',
      name: i18n.COLUMN_TAGS,
      width: '160px',
      render: (tags: string[], taskList) =>
        tags.length > 0 ? (
          <EuiFlexGroup
            gutterSize="xs"
            wrap
            responsive={false}
            data-test-subj={`investigationTaskListTags-${taskList.id}`}
          >
            {tags.map((tag) => (
              <EuiFlexItem grow={false} key={tag}>
                <EuiBadge color="hollow">{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : (
          <EuiText size="s" color="subdued">
            {i18n.NO_TAGS}
          </EuiText>
        ),
    },
    {
      name: i18n.COLUMN_TASK_COUNT,
      width: '70px',
      align: 'right',
      render: (taskList: TaskList) => (
        <span data-test-subj={`investigationTaskListCount-${taskList.id}`}>
          {countTasks(taskList)}
        </span>
      ),
    },
    {
      name: i18n.COLUMN_USED_BY,
      width: '200px',
      render: (taskList: TaskList) => {
        const names = usedBy.get(taskList.id) ?? [];
        return names.length > 0 ? (
          <EuiFlexGroup
            gutterSize="xs"
            wrap
            responsive={false}
            css={fitColumnStyles}
            data-test-subj={`investigationTaskListUsedBy-${taskList.id}`}
          >
            {names.map((name) => (
              <EuiFlexItem grow={false} key={name} css={fitColumnStyles}>
                <EuiBadge color="hollow">{name}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : (
          <EuiText
            size="s"
            color="subdued"
            data-test-subj={`investigationTaskListUsedBy-${taskList.id}`}
          >
            {i18n.NOT_USED}
          </EuiText>
        );
      },
    },
    {
      name: i18n.COLUMN_UPDATED,
      width: '120px',
      render: (taskList: TaskList) => <RelativeTime value={taskList.updated_at} />,
    },
    {
      name: i18n.COLUMN_ACTIONS,
      width: '190px',
      render: (taskList: TaskList) => (
        <EuiFlexGroup gutterSize="xs" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType={ICONS.edit}
              aria-label={i18n.EDIT_TASK_LIST_ARIA(taskList.name)}
              onClick={() => navigate(getTaskListPath(taskList.id))}
              data-test-subj={`investigationTaskListEdit-${taskList.id}`}
            >
              {i18n.EDIT_TASK_LIST}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {canManage ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                color="danger"
                iconType={ICONS.trash}
                aria-label={i18n.DELETE_TASK_LIST_ARIA(taskList.name)}
                onClick={() => setTaskListToDelete(taskList)}
                data-test-subj={`investigationTaskListDelete-${taskList.id}`}
              >
                {i18n.DELETE_TASK_LIST}
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ),
    },
  ];

  const addButton = (
    <EuiButton
      fill
      iconType={ICONS.add}
      isDisabled={isAtLimit}
      onClick={() => navigate(NEW_TASK_LIST_PATH)}
      data-test-subj="investigationTaskListsAdd"
    >
      {i18n.ADD_TASK_LIST}
    </EuiButton>
  );

  const renderTable = () => {
    if (taskListsQuery.isLoading) {
      return <LoadingState label={i18n.TASK_LISTS_LOADING} />;
    }
    if (taskListsQuery.isError) {
      return (
        <ErrorState
          title={i18n.TASK_LISTS_LOAD_ERROR}
          error={taskListsQuery.error}
          onRetry={() => void taskListsQuery.refetch()}
        />
      );
    }
    if (taskLists.length === 0) {
      return (
        <EmptyState
          iconType={ICONS.procedure}
          title={i18n.TASK_LISTS_EMPTY}
          actions={canManage ? addButton : undefined}
          data-test-subj="investigationTaskListsEmpty"
        />
      );
    }
    return (
      <EuiBasicTable
        tableCaption={i18n.TASK_LISTS_TABLE_CAPTION}
        items={taskLists}
        itemId="id"
        columns={columns}
        loading={taskListsQuery.isFetching}
        rowProps={(taskList) => ({
          'data-test-subj': `investigationTaskListRow-${taskList.id}`,
        })}
        data-test-subj="investigationTaskListsTable"
      />
    );
  };

  return (
    <div data-test-subj="investigationTaskListsTab">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false} wrap>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{i18n.TASK_LISTS_TITLE}</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>{i18n.TASK_LISTS_DESCRIPTION}</p>
          </EuiText>
        </EuiFlexItem>
        {canManage && taskLists.length > 0 ? (
          <EuiFlexItem grow={false}>{addButton}</EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {canManage ? null : (
        <>
          <EuiCallOut
            announceOnMount={false}
            size="s"
            iconType={ICONS.lock}
            title={i18n.TASK_LISTS_READ_ONLY}
            data-test-subj="investigationTaskListsReadOnly"
          />
          <EuiSpacer size="m" />
        </>
      )}
      {isAtLimit ? (
        <>
          <EuiText size="xs" color="subdued" data-test-subj="investigationTaskListsMax">
            {i18n.TASK_LISTS_MAX(MAX_TASK_LISTS_PER_SPACE)}
          </EuiText>
          <EuiSpacer size="s" />
        </>
      ) : null}
      {renderTable()}
      {taskListToDelete ? (
        <ConfirmModal
          title={i18n.DELETE_TASK_LIST_TITLE(taskListToDelete.name)}
          body={<p>{i18n.DELETE_TASK_LIST_BODY}</p>}
          confirmLabel={i18n.DELETE_TASK_LIST}
          destructive
          isLoading={deleteTaskList.isLoading}
          onConfirm={handleDelete}
          onCancel={() => setTaskListToDelete(null)}
          data-test-subj="investigationTaskListDeleteModal"
        />
      ) : null}
      {isAdding ? <TaskListEditor onClose={() => navigate(TASK_LISTS_PATH)} /> : null}
      {editTaskListId ? (
        <TaskListEditor
          key={editTaskListId}
          taskListId={editTaskListId}
          onClose={() => navigate(TASK_LISTS_PATH)}
        />
      ) : null}
    </div>
  );
};
TaskListsTab.displayName = 'TaskListsTab';

const clampStyles = css`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

/** Long template names truncate inside the column (EuiBadge shows the full name as its title). */
const fitColumnStyles = css`
  min-width: 0;
  max-width: 100%;
`;
