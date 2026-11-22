/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonGroup,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiProgress,
  EuiScreenReaderOnly,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { DropResult } from '@elastic/eui';
import { css } from '@emotion/react';
import { useQueryClient } from '@kbn/react-query';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { INVESTIGATION_AGENT_ID } from '../../../../common/investigations/types';
import type {
  ItemPatch,
  TaskItem,
  TaskPriority as TaskPriorityValue,
  ProcedurePhase,
} from '../../../../common/investigations/types';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { useGetCurrentUserProfile } from '../../../containers/user_profiles/use_get_current_user_profile';
import {
  useBulkDeleteItems,
  useInvestigationToasts,
  useInvestigationsNavigation,
  useProcedureTemplates,
  useUpdateItem,
} from '../../hooks';
import { useReorderTasks, useRunTaskWorkflow, useWorkflowList } from '../../hooks/use_tasks';
import { investigationKeys } from '../../api/query_keys';
import { ICONS } from '../../icons';
import { useInvestigationsServices } from '../../services';
import { converse } from '../conversation/conversation_api';
import { TEMPLATES_PATH, getTaskListPath } from '../settings/paths';
import { ConfirmModal, EmptyState, ErrorState, LoadingState, useNow } from '../shared';
import { isTaskItem, useAllItems } from '../scope/use_all_items';
import { useItemsByIds } from '../scope/use_items_by_ids';
import type { TabProps } from '../tabs/tab_props';
import { ApplyProcedureModal } from './apply_procedure_modal';
import { CancelTaskModal } from './cancel_task_modal';
import {
  MAX_TASKS,
  OWNER_TYPES,
  OWNER_TYPE_LABELS,
  PHASES,
  getEffectiveStatus,
  groupTasks,
  isAssignedTo,
  isTaskFinished,
  isTaskOverdue,
} from './procedure_helpers';
import type { TaskFilter, TaskGroup } from './procedure_helpers';
import { TaskFormModal } from './task_form_modal';
import { TaskRow } from './task_row';
import type { TaskRowHandlers } from './task_row';
import * as i18n from './translations';

const HIGHLIGHT_MS = 3500;
const RUNNING_REFRESH_MS = 4000;

interface FormTarget {
  parent?: TaskItem;
  phase?: ProcedurePhase;
}

export const ProcedurePanel: React.FC<TabProps> = ({
  record,
  agentAvailable,
  openItemId,
  onNavigateTab,
  onOpenModal,
}) => {
  const recordId = record.id;
  const { euiTheme } = useEuiTheme();
  const { showSuccess, showError } = useInvestigationToasts();
  const { http } = useInvestigationsServices();
  const { navigate, getHref } = useInvestigationsNavigation();
  const queryClient = useQueryClient();
  const { permissions } = useCasesContext();
  const now = useNow();
  const { data: currentUserProfile } = useGetCurrentUserProfile();
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const tasksQuery = useAllItems(recordId, 'task', isTaskItem, MAX_TASKS);
  const templatesQuery = useProcedureTemplates();
  const updateItem = useUpdateItem(recordId);
  const deleteItems = useBulkDeleteItems(recordId);
  const reorderTasks = useReorderTasks(recordId);
  const runWorkflow = useRunTaskWorkflow(recordId);

  const [filter, setFilter] = useState<TaskFilter>('all');
  const [ownerFilter, setOwnerFilter] = useState<(typeof OWNER_TYPES)[number] | 'any'>('any');
  const [cancelTask, setCancelTask] = useState<TaskItem | null>(null);
  const [deleteTask, setDeleteTask] = useState<TaskItem | null>(null);
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [agentRunTaskId, setAgentRunTaskId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const handledItemIdRef = useRef<string | undefined>(undefined);

  const tasks = useMemo(() => tasksQuery.data?.items ?? [], [tasksQuery.data]);
  const groups = useMemo(() => groupTasks(tasks), [tasks]);
  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const claimIds = useMemo(
    () =>
      tasks.flatMap((task) =>
        task.task.auto?.type === 'claim' && task.task.auto.claim_id ? [task.task.auto.claim_id] : []
      ),
    [tasks]
  );
  const { itemsById: claimsById } = useItemsByIds(recordId, 'claim', claimIds);
  const assigneeUids = useMemo(
    () => Array.from(new Set(tasks.flatMap((task) => task.task.assignees))),
    [tasks]
  );
  const { data: userProfiles } = useBulkGetUserProfiles({ uids: assigneeUids });
  const profiles = useMemo(() => userProfiles ?? new Map(), [userProfiles]);

  const hasWorkflowTasks = tasks.some((task) => Boolean(task.task.workflow_id));
  const workflows = useWorkflowList(hasWorkflowTasks);
  const hasRunningWorkflow = tasks.some((task) => task.task.workflow_run?.status === 'running');

  const templates = templatesQuery.data?.templates ?? [];
  const template = templates.find(
    (candidate) =>
      (record.template_id && candidate.template_id === record.template_id) ||
      candidate.type === record.investigation_type
  );
  const hasTaskList = (template?.tasks.length ?? 0) > 0;
  const isClosed = record.status === 'closed';
  const canEdit = permissions.update;
  const canAdd = canEdit && !isClosed && tasks.length < MAX_TASKS;
  const isAtLimit = tasks.length >= MAX_TASKS;

  // The server settles a workflow run when the tasks are read, so refresh while one is going.
  useEffect(() => {
    if (!hasRunningWorkflow) {
      return;
    }
    const timer = setInterval(() => {
      void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
    }, RUNNING_REFRESH_MS);
    return () => clearInterval(timer);
  }, [hasRunningWorkflow, queryClient, recordId]);

  // Scroll to and highlight the task another tab or an activity link points to.
  useEffect(() => {
    if (!openItemId || handledItemIdRef.current === openItemId || !tasksById.has(openItemId)) {
      return;
    }
    handledItemIdRef.current = openItemId;
    setFilter('all');
    setOwnerFilter('any');
    setHighlightedId(openItemId);
    const scrollTimer = setTimeout(() => {
      document
        .getElementById(`investigation-task-${openItemId}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 80);
    const clearTimer = setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [openItemId, tasksById]);

  const patchTask = useCallback(
    (task: TaskItem, patch: ItemPatch, onSuccess?: () => void) =>
      updateItem.mutate({ itemId: task.id, version: task.version ?? '', patch }, { onSuccess }),
    [updateItem]
  );

  const conversationId = record.conversation_id;
  const handleRunWithAgent = async (task: TaskItem) => {
    if (!conversationId) {
      return;
    }
    setAgentRunTaskId(task.id);
    const started = await updateItem
      .mutateAsync({
        itemId: task.id,
        version: task.version ?? '',
        patch: { status: 'in_progress' },
      })
      .then(() => true)
      .catch(() => false);
    if (started) {
      try {
        await converse(http, {
          agentId: INVESTIGATION_AGENT_ID,
          conversationId,
          input: i18n.AGENT_RUN_PROMPT(task.ref),
          triggerMode: 'always',
        });
        showSuccess(i18n.RUN_WITH_AGENT_SUCCESS(task.title));
      } catch (error) {
        showError(error, i18n.RUN_WITH_AGENT_ERROR);
      }
    }
    await queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
    setAgentRunTaskId(null);
  };

  const handleCancel = (reason: string) => {
    if (!cancelTask) {
      return;
    }
    const target = cancelTask;
    patchTask(target, { status: 'cancelled', task: { cancel_reason: reason } }, () => {
      showSuccess(i18n.CANCEL_SUCCESS(target.title));
      setCancelTask(null);
    });
  };

  const handleDelete = () => {
    if (!deleteTask) {
      return;
    }
    const target = deleteTask;
    const subtaskIds = tasks
      .filter((task) => task.task.parent_task_id === target.id)
      .map((task) => task.id);
    deleteItems.mutate(
      { ids: [target.id, ...subtaskIds] },
      {
        onSuccess: () => {
          showSuccess(i18n.DELETE_SUCCESS(target.title));
          setDeleteTask(null);
        },
      }
    );
  };

  const handlers: TaskRowHandlers = {
    onToggleDone: (task) => patchTask(task, { status: 'completed' }),
    onMarkInProgress: (task) => patchTask(task, { status: 'in_progress' }),
    onReopen: (task) => patchTask(task, { status: 'open' }),
    onCancel: setCancelTask,
    onPriorityChange: (task: TaskItem, priority: TaskPriorityValue) =>
      patchTask(task, { task: { priority } }),
    onDueDateChange: (task, dueDate) => patchTask(task, { task: { due_date: dueDate } }),
    onAssigneesChange: (task, uids) => patchTask(task, { task: { assignees: uids } }),
    onAddSubtask: (task) => setFormTarget({ parent: task }),
    onDelete: setDeleteTask,
    onRunWorkflow: (task) => runWorkflow.mutate(task.id),
    onRunWithAgent: (task) => void handleRunWithAgent(task),
    onNavigateTab,
  };

  const getWorkflowDisabledReason = (task: TaskItem): string | null => {
    if (workflows.isError) {
      return i18n.WORKFLOWS_UNAVAILABLE_REASON;
    }
    if (workflows.isLoading) {
      return i18n.WORKFLOWS_LOADING_REASON;
    }
    const available = workflows.data?.results ?? [];
    if (available.length === 0) {
      return i18n.NO_WORKFLOWS_REASON;
    }
    if (!available.some((workflow) => workflow.id === task.task.workflow_id)) {
      return i18n.WORKFLOW_NOT_FOUND_REASON;
    }
    if (!canExecuteWorkflow) {
      return i18n.NO_EXECUTE_PRIVILEGE_REASON;
    }
    return null;
  };

  const matchesFilters = useCallback(
    (task: TaskItem): boolean => {
      if (ownerFilter !== 'any' && task.task.owner.type !== ownerFilter) {
        return false;
      }
      switch (filter) {
        case 'mine':
          return isAssignedTo(task, currentUserProfile?.uid);
        case 'open':
          return !isTaskFinished(task);
        case 'required':
          return task.task.required;
        default:
          return true;
      }
    },
    [currentUserProfile?.uid, filter, ownerFilter]
  );

  const isFiltered = filter !== 'all' || ownerFilter !== 'any';
  const canReorder = canEdit && !isFiltered && !reorderTasks.isLoading;
  const visibleGroups: TaskGroup[] = useMemo(
    () =>
      groups
        .filter(({ root, subtasks }) => matchesFilters(root) || subtasks.some(matchesFilters))
        .map(({ root, subtasks }) => ({
          root,
          subtasks: matchesFilters(root) ? subtasks : subtasks.filter(matchesFilters),
        })),
    [groups, matchesFilters]
  );

  const handleDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.droppableId !== source.droppableId) {
      return;
    }
    if (destination.index === source.index) {
      return;
    }
    const move = (ids: string[]): string[] => {
      const next = [...ids];
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      return next;
    };
    let siblings: TaskItem[];
    let taskIds: string[];
    if (source.droppableId.startsWith('phase:')) {
      const phase = source.droppableId.slice('phase:'.length);
      const phaseIds = groups
        .filter(({ root }) => root.task.phase === phase)
        .map(({ root }) => root.id);
      const reordered = move(phaseIds);
      // Roots of other phases keep their slots; the phase's roots refill theirs in the new order.
      const queue = [...reordered];
      taskIds = groups.map(({ root }) =>
        root.task.phase === phase ? queue.shift() ?? root.id : root.id
      );
      siblings = reordered.flatMap((id) => tasksById.get(id) ?? []);
    } else {
      const parentId = source.droppableId.slice('sub:'.length);
      const subtaskIds = (groups.find(({ root }) => root.id === parentId)?.subtasks ?? []).map(
        (task) => task.id
      );
      taskIds = move(subtaskIds);
      siblings = taskIds.flatMap((id) => tasksById.get(id) ?? []);
    }
    const moved = siblings[destination.index];
    if (moved) {
      setAnnouncement(i18n.MOVED_ANNOUNCEMENT(moved.title, destination.index + 1, siblings.length));
    }
    reorderTasks.mutate(taskIds);
  };

  if (tasksQuery.isLoading) {
    return <LoadingState label={i18n.LOADING} />;
  }
  if (tasksQuery.error) {
    return (
      <ErrorState
        title={i18n.LOAD_ERROR}
        error={tasksQuery.error}
        onRetry={() => void tasksQuery.refetch()}
      />
    );
  }

  const applicable = tasks.filter((task) => task.status !== 'cancelled');
  const doneCount = applicable.filter((task) => task.status === 'completed').length;
  const requiredLeft = tasks.filter((task) => task.task.required && !isTaskFinished(task)).length;
  const overdueCount = tasks.filter((task) => isTaskOverdue(task, now)).length;
  const progress = applicable.length > 0 ? Math.round((doneCount / applicable.length) * 100) : 0;
  const openCount = tasks.filter((task) => !isTaskFinished(task)).length;

  const counts = {
    all: tasks.length,
    mine: tasks.filter((task) => isAssignedTo(task, currentUserProfile?.uid)).length,
    open: openCount,
    required: tasks.filter((task) => task.task.required).length,
  };

  const modals = (
    <>
      {cancelTask ? (
        <CancelTaskModal
          task={cancelTask}
          isLoading={updateItem.isLoading}
          onConfirm={handleCancel}
          onClose={() => setCancelTask(null)}
        />
      ) : null}
      {deleteTask ? (
        <ConfirmModal
          title={i18n.DELETE_TASK_TITLE(deleteTask.title)}
          body={
            <p>
              {i18n.DELETE_TASK_BODY(
                tasks.filter((task) => task.task.parent_task_id === deleteTask.id).length
              )}
            </p>
          }
          confirmLabel={i18n.DELETE_TASK}
          destructive
          isLoading={deleteItems.isLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTask(null)}
          data-test-subj="investigationDeleteTaskModal"
        />
      ) : null}
      {formTarget ? (
        <TaskFormModal
          record={record}
          parent={formTarget.parent}
          defaultPhase={formTarget.phase}
          currentUserProfile={currentUserProfile}
          onClose={() => setFormTarget(null)}
        />
      ) : null}
      {isApplyOpen ? (
        <ApplyProcedureModal
          record={record}
          tasks={tasks}
          template={template}
          onClose={() => setIsApplyOpen(false)}
        />
      ) : null}
    </>
  );

  const applyButton = (
    <EuiToolTip content={hasTaskList ? undefined : i18n.NO_TEMPLATE_FOR_TYPE}>
      <EuiButton
        size="s"
        fill={tasks.length === 0}
        iconType={ICONS.refresh}
        isDisabled={!hasTaskList || !canEdit || isClosed}
        onClick={() => setIsApplyOpen(true)}
        data-test-subj="investigationProcedureApply"
      >
        {i18n.APPLY_PROCEDURE}
      </EuiButton>
    </EuiToolTip>
  );
  const addTaskButton = canAdd ? (
    <EuiButton
      size="s"
      iconType={ICONS.add}
      onClick={() => setFormTarget({})}
      data-test-subj="investigationProcedureAddTask"
    >
      {i18n.ADD_TASK}
    </EuiButton>
  ) : null;
  // Task lists are edited in one place: the template's task list in Investigation settings.
  const taskListPath = template ? getTaskListPath(template.template_id) : TEMPLATES_PATH;
  const configureButton = (
    <EuiButton
      size="s"
      iconType={ICONS.template}
      href={getHref(taskListPath)}
      onClick={(event: React.MouseEvent) => {
        event.preventDefault();
        navigate(taskListPath);
      }}
      data-test-subj="investigationProcedureConfigure"
    >
      {i18n.CONFIGURE}
    </EuiButton>
  );

  if (tasks.length === 0) {
    return (
      <div data-test-subj="investigationProcedureTab">
        <EmptyState
          iconType={ICONS.procedure}
          title={i18n.EMPTY_TITLE}
          body={i18n.EMPTY_BODY(record.investigation_type || i18n.TYPE_NOT_SET)}
          actions={
            <EuiFlexGroup gutterSize="s" justifyContent="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>{applyButton}</EuiFlexItem>
              {addTaskButton ? <EuiFlexItem grow={false}>{addTaskButton}</EuiFlexItem> : null}
              <EuiFlexItem grow={false}>{configureButton}</EuiFlexItem>
            </EuiFlexGroup>
          }
          data-test-subj="investigationProcedureEmpty"
        />
        {modals}
      </div>
    );
  }

  const filterOptions: Array<{ id: TaskFilter; label: string }> = [
    { id: 'all', label: i18n.FILTER_ALL(counts.all) },
    { id: 'mine', label: i18n.FILTER_MINE(counts.mine) },
    { id: 'open', label: i18n.FILTER_OPEN(counts.open) },
    { id: 'required', label: i18n.FILTER_REQUIRED(counts.required) },
  ];

  const renderTask = (
    task: TaskItem,
    isSubtask: boolean,
    dragHandle: React.ReactNode
  ): React.ReactElement => {
    const dependency = task.task.depends_on ? tasksById.get(task.task.depends_on) : undefined;
    const claimId = task.task.auto?.type === 'claim' ? task.task.auto.claim_id : undefined;
    const claim = claimId ? claimsById.get(claimId) : undefined;
    return (
      <TaskRow
        key={task.id}
        {...handlers}
        task={task}
        record={record}
        isSubtask={isSubtask}
        effectiveStatus={getEffectiveStatus(task, tasksById, claimsById)}
        dependency={dependency}
        claim={claim}
        userProfiles={profiles}
        currentUserProfile={currentUserProfile}
        now={now}
        isHighlighted={highlightedId === task.id}
        isBusy={
          (updateItem.isLoading && updateItem.variables?.itemId === task.id) ||
          (runWorkflow.isLoading && runWorkflow.variables === task.id) ||
          agentRunTaskId === task.id
        }
        canEdit={canEdit}
        canAssign={permissions.assign}
        canAddSubtask={canAdd && !isSubtask}
        canRunWithAgent={
          agentAvailable &&
          Boolean(conversationId) &&
          !isClosed &&
          task.task.owner.type === 'agent' &&
          !task.task.auto &&
          !isTaskFinished(task)
        }
        isRunningWithAgent={agentRunTaskId === task.id}
        workflowDisabledReason={getWorkflowDisabledReason(task)}
        dragHandle={dragHandle}
      />
    );
  };

  const renderHandle = (
    task: TaskItem,
    dragHandleProps: React.HTMLAttributes<HTMLDivElement> | null | undefined
  ): React.ReactNode =>
    canReorder ? (
      <div
        {...dragHandleProps}
        aria-label={i18n.DRAG_TO_REORDER}
        data-test-subj={`investigationTaskDrag-${task.id}`}
        css={css`
          display: flex;
          align-items: center;
          padding-block: ${euiTheme.size.xs};
          cursor: grab;
        `}
      >
        <EuiIcon type={ICONS.dragHandle} color="subdued" aria-hidden="true" />
      </div>
    ) : null;

  return (
    <div data-test-subj="investigationProcedureTab">
      <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
            <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={ICONS.procedure} aria-hidden="true" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>{i18n.TITLE}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="investigationProcedureType">
                  {record.investigation_type || i18n.TYPE_NOT_SET}
                </EuiBadge>
              </EuiFlexItem>
              {overdueCount > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="danger" data-test-subj="investigationProcedureOverdue">
                    {i18n.OVERDUE_COUNT(overdueCount)}
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow />
              {addTaskButton ? <EuiFlexItem grow={false}>{addTaskButton}</EuiFlexItem> : null}
              <EuiFlexItem grow={false}>{applyButton}</EuiFlexItem>
              <EuiFlexItem grow={false}>{configureButton}</EuiFlexItem>
            </EuiFlexGroup>
            {isAtLimit ? (
              <EuiText
                size="xs"
                color="subdued"
                css={css`
                  margin-block-start: ${euiTheme.size.xs};
                `}
                data-test-subj="investigationProcedureMaxTasks"
              >
                {i18n.MAX_TASKS_REACHED(MAX_TASKS)}
              </EuiText>
            ) : null}
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiProgress
                  value={progress}
                  max={100}
                  size="m"
                  color="success"
                  aria-label={i18n.PROGRESS_LABEL}
                  data-test-subj="investigationProcedureProgress"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" data-test-subj="investigationProcedureDoneCount">
                  <strong>{i18n.DONE_OF_TOTAL(doneCount, applicable.length)}</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiFlexGroup
              gutterSize="m"
              alignItems="flexStart"
              justifyContent="spaceBetween"
              responsive={false}
              wrap
            >
              <EuiFlexItem grow={false}>
                {requiredLeft > 0 ? (
                  <div>
                    <EuiBadge color="warning" data-test-subj="investigationProcedureRequiredLeft">
                      {i18n.REQUIRED_LEFT(requiredLeft)}
                    </EuiBadge>
                  </div>
                ) : (
                  <div>
                    <EuiBadge
                      color="success"
                      iconType={ICONS.check}
                      data-test-subj="investigationProcedureRequiredLeft"
                    >
                      {i18n.ALL_REQUIRED_DONE}
                    </EuiBadge>
                  </div>
                )}
                <EuiText
                  size="xs"
                  color="subdued"
                  css={css`
                    margin-block-start: ${euiTheme.size.xs};
                    max-width: 640px;
                  `}
                >
                  {i18n.HEADER_NOTE(record.investigation_type || i18n.TYPE_NOT_SET)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {isClosed ? (
                  <EuiBadge color="hollow">{i18n.CLOSED}</EuiBadge>
                ) : (
                  <EuiButton
                    size="s"
                    fill
                    onClick={() => onOpenModal('close')}
                    data-test-subj="investigationProcedureClose"
                  >
                    {i18n.CLOSE_INVESTIGATION}
                  </EuiButton>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend={i18n.FILTER_LABEL}
                  buttonSize="s"
                  options={filterOptions.map((option) => ({
                    id: `investigationTaskFilter-${option.id}`,
                    label: option.label,
                    'data-test-subj': `investigationTaskFilter-${option.id}`,
                  }))}
                  idSelected={`investigationTaskFilter-${filter}`}
                  onChange={(id) =>
                    setFilter(
                      filterOptions.find((option) => `investigationTaskFilter-${option.id}` === id)
                        ?.id ?? 'all'
                    )
                  }
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  compressed
                  aria-label={i18n.OWNER_FILTER_LABEL}
                  value={ownerFilter}
                  options={[
                    { value: 'any', text: i18n.OWNER_FILTER_ALL },
                    ...OWNER_TYPES.map((type) => ({ value: type, text: OWNER_TYPE_LABELS[type] })),
                  ]}
                  onChange={(event) =>
                    setOwnerFilter(OWNER_TYPES.find((type) => type === event.target.value) ?? 'any')
                  }
                  data-test-subj="investigationTaskOwnerFilter"
                />
              </EuiFlexItem>
              {canEdit && isFiltered ? (
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="xs"
                    color="subdued"
                    data-test-subj="investigationProcedureReorderHint"
                  >
                    {i18n.REORDER_NEEDS_ALL}
                  </EuiText>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiDragDropContext onDragEnd={handleDragEnd}>
          {PHASES.map((phase) => {
            const rows = visibleGroups.filter(({ root }) => root.task.phase === phase);
            if (rows.length === 0) {
              return null;
            }
            const phaseTasks = tasks.filter((task) => task.task.phase === phase);
            const phaseApplicable = phaseTasks.filter((task) => task.status !== 'cancelled');
            const phaseDone = phaseApplicable.filter((task) => task.status === 'completed').length;
            return (
              <EuiFlexItem grow={false} key={phase}>
                <EuiPanel
                  paddingSize="none"
                  hasShadow={false}
                  hasBorder
                  data-test-subj={`investigationProcedurePhase-${phase}`}
                >
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                    css={css`
                      padding: ${euiTheme.size.m};
                      border-block-end: ${euiTheme.border.thin};
                    `}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xxs">
                        <h3>{phase}</h3>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        {i18n.PHASE_COUNT(phaseDone, phaseApplicable.length)}
                      </EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiDroppable droppableId={`phase:${phase}`} type="root" spacing="none">
                    {rows.map(({ root, subtasks }, index) => (
                      <EuiDraggable
                        key={root.id}
                        draggableId={root.id}
                        index={index}
                        spacing="none"
                        customDragHandle
                        isDragDisabled={!canReorder}
                      >
                        {(provided) => (
                          <div>
                            {renderTask(root, false, renderHandle(root, provided.dragHandleProps))}
                            {subtasks.length > 0 ? (
                              <EuiDroppable
                                droppableId={`sub:${root.id}`}
                                type={`sub:${root.id}`}
                                spacing="none"
                              >
                                {subtasks.map((subtask, subIndex) => (
                                  <EuiDraggable
                                    key={subtask.id}
                                    draggableId={subtask.id}
                                    index={subIndex}
                                    spacing="none"
                                    customDragHandle
                                    isDragDisabled={!canReorder}
                                  >
                                    {(subProvided) =>
                                      renderTask(
                                        subtask,
                                        true,
                                        renderHandle(subtask, subProvided.dragHandleProps)
                                      )
                                    }
                                  </EuiDraggable>
                                ))}
                              </EuiDroppable>
                            ) : null}
                          </div>
                        )}
                      </EuiDraggable>
                    ))}
                  </EuiDroppable>
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
        </EuiDragDropContext>
        {visibleGroups.length === 0 ? (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued" data-test-subj="investigationProcedureNoMatch">
              <p>{i18n.NO_TASKS_MATCH}</p>
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiScreenReaderOnly>
        <div role="status" aria-live="polite" data-test-subj="investigationProcedureAnnouncement">
          {announcement}
        </div>
      </EuiScreenReaderOnly>
      {modals}
    </div>
  );
};
ProcedurePanel.displayName = 'ProcedurePanel';
