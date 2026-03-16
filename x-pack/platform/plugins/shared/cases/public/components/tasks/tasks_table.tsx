/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { DropResult } from '@elastic/eui';
import {
  EuiAvatar,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  euiDragDropReorder,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiSkeletonText,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { getUserDisplayName } from '@kbn/user-profile-components';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import { useDeleteTask } from '../../containers/use_delete_task';
import { useUpdateTask } from '../../containers/use_update_task';
import { useReorderTasks } from '../../containers/use_reorder_tasks';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { useTaskStatuses } from './use_task_statuses';
import * as i18n from './translations';

// Grid column definition shared between the header row and every data row.
// Uses fr units so the table expands to fill available width.
// Drag handle and actions are fixed; title gets the most space; the rest share equally.
const GRID_COLUMNS = '24px 3fr 1.2fr 1fr 1fr 40px';

// ---------------------------------------------------------------------------
// Tree building
// ---------------------------------------------------------------------------

interface TaskRow extends CaseTask {
  _depth: number;
  _hasChildren: boolean;
}

const buildFlatTree = (tasks: CaseTask[], expandedIds: Set<string>): TaskRow[] => {
  const childrenMap = new Map<string | null, CaseTask[]>();
  for (const task of tasks) {
    const pid = task.parent_task_id ?? null;
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(task);
  }

  const result: TaskRow[] = [];

  const visit = (parentId: string | null, depth: number) => {
    const children = childrenMap.get(parentId) ?? [];
    for (const task of children) {
      const taskChildren = childrenMap.get(task.id) ?? [];
      const hasChildren = taskChildren.length > 0;
      result.push({ ...task, _depth: depth, _hasChildren: hasChildren });
      if (hasChildren && expandedIds.has(task.id)) {
        visit(task.id, depth + 1);
      }
    }
  };

  visit(null, 0);
  return result;
};

// Status display maps are built dynamically from configured statuses in the component.

// ---------------------------------------------------------------------------
// Title cell with checkbox
// ---------------------------------------------------------------------------

interface TaskTitleCellProps {
  row: TaskRow;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleComplete: (task: TaskRow) => void;
}

const TaskTitleCell: React.FC<TaskTitleCellProps> = ({
  row,
  expandedIds,
  onToggleExpand,
  onToggleComplete,
}) => {
  const { euiTheme } = useEuiTheme();
  const checkboxId = useGeneratedHtmlId({ prefix: 'task-check' });
  const isCompleted = row.status === 'done';

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      responsive={false}
      style={{ paddingLeft: row._depth * 20 }}
    >
      {row._hasChildren ? (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={expandedIds.has(row.id) ? 'arrowDown' : 'arrowRight'}
            aria-label={expandedIds.has(row.id) ? i18n.COLLAPSE_SUBTASKS : i18n.EXPAND_SUBTASKS}
            size="xs"
            onClick={() => onToggleExpand(row.id)}
            data-test-subj={`cases-tasks-expand-${row.id}`}
          />
        </EuiFlexItem>
      ) : (
        <EuiFlexItem grow={false} style={{ width: 24 }} />
      )}
      <EuiFlexItem grow={false}>
        <EuiCheckbox
          id={checkboxId}
          checked={isCompleted}
          onChange={() => onToggleComplete(row)}
          aria-label={isCompleted ? i18n.MARK_INCOMPLETE : i18n.MARK_COMPLETE}
          data-test-subj={`cases-tasks-check-${row.id}`}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText
          size="s"
          style={
            isCompleted
              ? { textDecoration: 'line-through', color: euiTheme.colors.textSubdued }
              : undefined
          }
        >
          {row._depth > 0 && (
            <span style={{ color: euiTheme.colors.textSubdued, marginRight: 4 }}>↳</span>
          )}
          {row.title}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// ---------------------------------------------------------------------------
// Actions popover
// ---------------------------------------------------------------------------

interface TaskActionsPopoverProps {
  row: TaskRow;
  onEdit?: (task: CaseTask) => void;
  onAddSubTask?: (task: CaseTask) => void;
  onDelete: (taskId: string) => void;
  onExpandParent?: (taskId: string) => void;
}

const TaskActionsPopover: React.FC<TaskActionsPopoverProps> = ({
  row,
  onEdit,
  onAddSubTask,
  onDelete,
  onExpandParent,
}) => {
  const buttonId = useGeneratedHtmlId({ prefix: 'task-actions' });
  const [isOpen, setIsOpen] = useState(false);

  const closePopover = useCallback(() => setIsOpen(false), []);
  const openPopover = useCallback(() => setIsOpen(true), []);

  const items = useMemo(
    () => [
      ...(onEdit
        ? [
            <EuiContextMenuItem
              key="edit"
              icon="pencil"
              data-test-subj={`cases-tasks-edit-${row.id}`}
              onClick={() => {
                closePopover();
                onEdit(row);
              }}
            >
              {i18n.EDIT_TASK}
            </EuiContextMenuItem>,
          ]
        : []),
      ...(onAddSubTask
        ? [
            <EuiContextMenuItem
              key="subtask"
              icon="branch"
              data-test-subj={`cases-tasks-add-subtask-${row.id}`}
              onClick={() => {
                closePopover();
                onExpandParent?.(row.id);
                onAddSubTask(row);
              }}
            >
              {i18n.ADD_SUBTASK}
            </EuiContextMenuItem>,
          ]
        : []),
      <EuiContextMenuItem
        key="delete"
        icon="trash"
        color="danger"
        data-test-subj={`cases-tasks-delete-${row.id}`}
        onClick={() => {
          closePopover();
          onDelete(row.id);
        }}
      >
        {i18n.DELETE_TASK}
      </EuiContextMenuItem>,
    ],
    [row, onEdit, onAddSubTask, onDelete, onExpandParent, closePopover]
  );

  return (
    <EuiPopover
      id={buttonId}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="leftCenter"
      button={
        <EuiButtonIcon
          iconType="boxesVertical"
          aria-label={i18n.TASK_ACTIONS}
          size="xs"
          color="text"
          onClick={openPopover}
          data-test-subj={`cases-tasks-actions-btn-${row.id}`}
        />
      }
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TasksTableProps {
  caseId: string;
  tasks: CaseTask[];
  isLoading: boolean;
  onAddTask?: () => void;
  onEditTask?: (task: CaseTask) => void;
  onAddSubTask?: (parentTask: CaseTask) => void;
  onApplyTemplate?: () => void;
}

export const TasksTable = React.memo<TasksTableProps>(
  ({ caseId, tasks, isLoading, onAddTask, onEditTask, onAddSubTask, onApplyTemplate }) => {
    const { euiTheme } = useEuiTheme();
    const { mutate: deleteTask } = useDeleteTask(caseId);
    const { mutate: updateTask } = useUpdateTask(caseId);
    const { mutate: reorderTasks } = useReorderTasks();
    const configuredStatuses = useTaskStatuses();

    const statusLabelMap = useMemo(
      () => Object.fromEntries(configuredStatuses.map((s) => [s.key, s.label])),
      [configuredStatuses]
    );
    const statusColorMap = useMemo(
      () => Object.fromEntries(configuredStatuses.map((s) => [s.key, s.color])),
      [configuredStatuses]
    );
    // Maps each status key to the next one in the configured order (wraps around)
    const nextStatusMap = useMemo(() => {
      const map: Record<string, string> = {};
      for (let i = 0; i < configuredStatuses.length; i++) {
        map[configuredStatuses[i].key] =
          configuredStatuses[(i + 1) % configuredStatuses.length].key;
      }
      return map;
    }, [configuredStatuses]);

    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
      // Expand all parent tasks by default
      const parentIds = new Set(tasks.map((t) => t.parent_task_id).filter(Boolean) as string[]);
      return parentIds;
    });

    const toggleExpand = useCallback((taskId: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(taskId)) next.delete(taskId);
        else next.add(taskId);
        return next;
      });
    }, []);

    const flatRows = useMemo(() => buildFlatTree(tasks, expandedIds), [tasks, expandedIds]);

    // Collect all unique assignee uids across all tasks
    const allAssigneeUids = useMemo(
      () => [...new Set(tasks.flatMap((t) => (t.assignees ?? []).map((a) => a.uid)))],
      [tasks]
    );

    const { data: profileMap = new Map() } = useBulkGetUserProfiles({ uids: allAssigneeUids });

    const handleStatusCycle = useCallback(
      (task: CaseTask) => {
        const nextStatus = nextStatusMap[task.status] ?? configuredStatuses[0]?.key ?? task.status;
        updateTask({
          taskId: task.id,
          request: { version: task.version, status: nextStatus },
        });
      },
      [updateTask, nextStatusMap, configuredStatuses]
    );

    // Only top-level tasks are reorderable; subtasks reorder within their parent group
    const onDragEnd = useCallback(
      ({ source, destination }: DropResult) => {
        if (!source || !destination || source.index === destination.index) return;
        const reordered = euiDragDropReorder(flatRows, source.index, destination.index);
        // Group by parent_task_id and call reorder for each affected group
        const groupedIds = new Map<string | null, string[]>();
        for (const row of reordered) {
          const pid = row.parent_task_id ?? null;
          if (!groupedIds.has(pid)) groupedIds.set(pid, []);
          groupedIds.get(pid)!.push(row.id);
        }
        for (const [parentTaskId, orderedTaskIds] of groupedIds.entries()) {
          reorderTasks({ caseId, orderedTaskIds, parentTaskId });
        }
      },
      [flatRows, caseId, reorderTasks]
    );

    if (isLoading) {
      return <EuiSkeletonText lines={5} />;
    }

    if (tasks.length === 0) {
      return (
        <EuiEmptyPrompt
          title={<h3>{i18n.NO_TASKS}</h3>}
          body={<p>{i18n.NO_TASKS_DESCRIPTION}</p>}
          titleSize="xs"
          data-test-subj="cases-tasks-table-empty"
          actions={
            <EuiFlexGroup gutterSize="s" justifyContent="center" wrap>
              {onAddTask && (
                <EuiFlexItem grow={false}>
                  <EuiButton size="s" onClick={onAddTask} iconType="plus" data-test-subj="cases-tasks-add-task-empty">
                    {i18n.ADD_TASK}
                  </EuiButton>
                </EuiFlexItem>
              )}
              {onApplyTemplate && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty size="s" iconType="documents" onClick={onApplyTemplate} data-test-subj="cases-tasks-apply-template-empty">
                    {i18n.APPLY_TEMPLATE}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
        />
      );
    }

    return (
      <>
        {/* Column header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRID_COLUMNS,
              padding: '0 8px 4px',
              borderBottom: `1px solid ${euiTheme.colors.borderBasePlain}`,
            }}
          >
            <span />
            <EuiText size="xs" color="subdued"><strong>{i18n.TASK_TITLE}</strong></EuiText>
            <EuiText size="xs" color="subdued"><strong>{i18n.TASK_STATUS}</strong></EuiText>
            <EuiText size="xs" color="subdued"><strong>{i18n.TASK_ASSIGNEES}</strong></EuiText>
            <EuiText size="xs" color="subdued"><strong>{i18n.TASK_DUE_DATE}</strong></EuiText>
            <span />
          </div>
          <EuiDragDropContext onDragEnd={onDragEnd}>
            <EuiDroppable droppableId="cases-tasks-list" spacing="none" data-test-subj="cases-tasks-table">
              {flatRows.map((row, idx) => (
                <EuiDraggable
                  key={row.id}
                  index={idx}
                  draggableId={row.id}
                  customDragHandle
                  data-test-subj={`cases-tasks-row-${row.id}`}
                >
                  {(provided) => (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: GRID_COLUMNS,
                        alignItems: 'center',
                        padding: '8px',
                        borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
                      }}
                    >
                      {/* Drag handle */}
                      <span
                        {...provided.dragHandleProps}
                        aria-label="Drag to reorder"
                        style={{ cursor: 'grab', color: euiTheme.colors.textSubdued, lineHeight: 1 }}
                      >
                        <EuiIcon type="grab" size="s" />
                      </span>
                      {/* Title */}
                      <TaskTitleCell
                        row={row}
                        expandedIds={expandedIds}
                        onToggleExpand={toggleExpand}
                        onToggleComplete={(task) => {
                          updateTask({
                            taskId: task.id,
                            request: {
                              version: task.version,
                              status: task.status === 'done' ? 'open' : 'done',
                            },
                          });
                        }}
                      />
                      {/* Status */}
                      <div>
                        <EuiToolTip content={i18n.CLICK_TO_ADVANCE_STATUS}>
                          <EuiBadge
                            color={statusColorMap[row.status] ?? 'default'}
                            onClick={() => handleStatusCycle(row)}
                            onClickAriaLabel={i18n.CLICK_TO_ADVANCE_STATUS}
                            data-test-subj={`cases-tasks-status-${row.id}`}
                          >
                            {statusLabelMap[row.status] ?? i18n.NO_STATUS}
                          </EuiBadge>
                        </EuiToolTip>
                      </div>
                      {/* Assignees */}
                      <div>
                        {row.assignees && row.assignees.length > 0 && (
                          <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                            {row.assignees.slice(0, 3).map(({ uid }) => {
                              const profile = profileMap.get(uid);
                              const displayName = profile ? getUserDisplayName(profile.user) : uid;
                              return (
                                <EuiFlexItem key={uid} grow={false}>
                                  <EuiToolTip content={displayName}>
                                    <EuiAvatar
                                      size="s"
                                      name={displayName}
                                      imageUrl={profile?.data?.avatar?.imageUrl}
                                      data-test-subj={`cases-tasks-assignee-${uid}`}
                                    />
                                  </EuiToolTip>
                                </EuiFlexItem>
                              );
                            })}
                            {row.assignees.length > 3 && (
                              <EuiFlexItem grow={false}>
                                <EuiText size="xs" color="subdued">+{row.assignees.length - 3}</EuiText>
                              </EuiFlexItem>
                            )}
                          </EuiFlexGroup>
                        )}
                      </div>
                      {/* Due date */}
                      <EuiText size="s">
                        {row.due_date ? new Date(row.due_date).toLocaleDateString() : '—'}
                      </EuiText>
                      {/* Actions */}
                      <TaskActionsPopover
                        row={row}
                        onEdit={onEditTask}
                        onAddSubTask={onAddSubTask}
                        onDelete={(taskId) => deleteTask(taskId)}
                        onExpandParent={(taskId) =>
                          setExpandedIds((prev) => new Set([...prev, taskId]))
                        }
                      />
                    </div>
                  )}
                </EuiDraggable>
              ))}
            </EuiDroppable>
          </EuiDragDropContext>
      </>
    );
  }
);

TasksTable.displayName = 'TasksTable';
