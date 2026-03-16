/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { DropResult } from '@elastic/eui';
import {
  EuiBadge,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  euiDragDropReorder,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import { useDeleteTask } from '../../containers/use_delete_task';
import { useUpdateTask } from '../../containers/use_update_task';
import { useReorderTasks } from '../../containers/use_reorder_tasks';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { useTaskStatuses } from './use_task_statuses';
import { TaskCard } from './task_card';
import * as i18n from './translations';

const UNASSIGNED_KEY = '__unassigned__';

interface TasksBoardProps {
  caseId: string;
  tasks: CaseTask[];
  onEditTask?: (task: CaseTask) => void;
  visibleStatuses?: Set<string>;
}

export const TasksBoard = React.memo<TasksBoardProps>(
  ({ caseId, tasks, onEditTask, visibleStatuses }) => {
    const { mutate: deleteTask } = useDeleteTask(caseId);
    const { mutate: updateTask } = useUpdateTask(caseId);
    const { mutate: reorderTasks } = useReorderTasks();
    const allStatuses = useTaskStatuses();

    const visibleStatusList = useMemo(
      () =>
        visibleStatuses
          ? allStatuses.filter((s) => visibleStatuses.has(s.key))
          : allStatuses,
      [allStatuses, visibleStatuses]
    );

    const allAssigneeUids = useMemo(
      () => [...new Set(tasks.flatMap((t) => (t.assignees ?? []).map((a) => a.uid)))],
      [tasks]
    );
    const { data: profileMap = new Map() } = useBulkGetUserProfiles({ uids: allAssigneeUids });

    // Group tasks by status. Top-level tasks are shown as cards;
    // sub-tasks are embedded inside their parent's card.
    const subTasksByParent = useMemo(() => {
      const map = new Map<string, CaseTask[]>();
      for (const task of tasks) {
        if (task.parent_task_id) {
          const bucket = map.get(task.parent_task_id) ?? [];
          bucket.push(task);
          map.set(task.parent_task_id, bucket);
        }
      }
      return map;
    }, [tasks]);

    const knownStatusKeys = useMemo(() => new Set(allStatuses.map((s) => s.key)), [allStatuses]);

    const columnTasks = useMemo(() => {
      const byStatus: Record<string, CaseTask[]> = {};
      for (const s of allStatuses) {
        byStatus[s.key] = [];
      }
      byStatus[UNASSIGNED_KEY] = [];
      for (const task of tasks) {
        if (!task.parent_task_id) {
          const key = knownStatusKeys.has(task.status) ? task.status : UNASSIGNED_KEY;
          const bucket = byStatus[key] ?? (byStatus[key] = []);
          bucket.push(task);
        }
      }
      return byStatus;
    }, [allStatuses, tasks, knownStatusKeys]);

    const onDragEnd = useCallback(
      ({ source, destination }: DropResult) => {
        if (!source || !destination) return;

        const sourceStatus = source.droppableId;
        const destStatus = destination.droppableId;

        if (sourceStatus === destStatus) {
          const reordered = euiDragDropReorder(
            columnTasks[sourceStatus],
            source.index,
            destination.index
          );
          reorderTasks({
            caseId,
            orderedTaskIds: reordered.map((t) => t.id),
            parentTaskId: null,
          });
        } else {
          const task = columnTasks[sourceStatus]?.[source.index];
          if (task) {
            updateTask({
              taskId: task.id,
              request: { version: task.version, status: destStatus },
            });
          }
        }
      },
      [caseId, columnTasks, reorderTasks, updateTask]
    );

    return (
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
          {(columnTasks[UNASSIGNED_KEY]?.length ?? 0) > 0 && (
            <EuiFlexItem key={UNASSIGNED_KEY} style={{ minWidth: 200 }}>
              <EuiPanel
                paddingSize="s"
                color="subdued"
                hasBorder={false}
                hasShadow={false}
                data-test-subj="cases-tasks-board-col-unassigned"
              >
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h4>{i18n.UNASSIGNED_COLUMN_LABEL}</h4>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="default">{columnTasks[UNASSIGNED_KEY].length}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiDroppable
                  droppableId={UNASSIGNED_KEY}
                  spacing="none"
                  style={{ minHeight: 80, paddingTop: 8 }}
                  data-test-subj="cases-tasks-board-droppable-unassigned"
                >
                  {columnTasks[UNASSIGNED_KEY].map((task, idx) => (
                    <EuiDraggable
                      key={task.id}
                      index={idx}
                      draggableId={task.id}
                      customDragHandle
                    >
                      {(provided) => (
                        <TaskCard
                          task={task}
                          profileMap={profileMap}
                          subTasks={subTasksByParent.get(task.id)}
                          onEdit={onEditTask}
                          onDelete={(taskId) => deleteTask(taskId)}
                          onToggleComplete={(t) =>
                            updateTask({
                              taskId: t.id,
                              request: { version: t.version, status: t.status === 'done' ? 'open' : 'done' },
                            })
                          }
                          dragHandleProps={
                            (provided.dragHandleProps ?? {}) as Record<string, unknown>
                          }
                        />
                      )}
                    </EuiDraggable>
                  ))}
                </EuiDroppable>
              </EuiPanel>
            </EuiFlexItem>
          )}
          {visibleStatusList.map(({ key, label, color }) => {
            const colTasks = columnTasks[key] ?? [];
            return (
              <EuiFlexItem key={key} style={{ minWidth: 200 }}>
                <EuiPanel
                  paddingSize="s"
                  color="subdued"
                  hasBorder={false}
                  hasShadow={false}
                  data-test-subj={`cases-tasks-board-col-${key}`}
                >
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem>
                      <EuiTitle size="xs">
                        <h4>{label}</h4>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color={color}>{colTasks.length}</EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiDroppable
                    droppableId={key}
                    spacing="none"
                    style={{ minHeight: 80, paddingTop: 8 }}
                    data-test-subj={`cases-tasks-board-droppable-${key}`}
                  >
                    {colTasks.length === 0 ? (
                      <EuiText
                        size="xs"
                        color="subdued"
                        textAlign="center"
                        style={{ padding: '16px 0' }}
                      >
                        {i18n.NO_TASKS}
                      </EuiText>
                    ) : (
                      colTasks.map((task, idx) => (
                        <EuiDraggable
                          key={task.id}
                          index={idx}
                          draggableId={task.id}
                          customDragHandle
                          data-test-subj={`cases-tasks-board-draggable-${task.id}`}
                        >
                          {(provided) => (
                            <TaskCard
                              task={task}
                              profileMap={profileMap}
                              subTasks={subTasksByParent.get(task.id)}
                              onEdit={onEditTask}
                              onDelete={(taskId) => deleteTask(taskId)}
                              onToggleComplete={(t) =>
                                updateTask({
                                  taskId: t.id,
                                  request: { version: t.version, status: t.status === 'done' ? 'open' : 'done' },
                                })
                              }
                              dragHandleProps={
                                (provided.dragHandleProps ?? {}) as Record<string, unknown>
                              }
                            />
                          )}
                        </EuiDraggable>
                      ))
                    )}
                  </EuiDroppable>
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </EuiDragDropContext>
    );
  }
);

TasksBoard.displayName = 'TasksBoard';
