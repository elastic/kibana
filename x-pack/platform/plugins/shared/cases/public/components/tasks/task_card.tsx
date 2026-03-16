/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAvatar,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { getUserDisplayName } from '@kbn/user-profile-components';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import * as i18n from './translations';

interface TaskCardProps {
  task: CaseTask;
  profileMap: Map<string, UserProfileWithAvatar>;
  subTasks?: CaseTask[];
  onEdit?: (task: CaseTask) => void;
  onDelete?: (taskId: string) => void;
  onToggleComplete?: (task: CaseTask) => void;
  dragHandleProps?: Record<string, unknown>;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  profileMap,
  subTasks,
  onEdit,
  onDelete,
  onToggleComplete,
  dragHandleProps,
}) => {
  const { euiTheme } = useEuiTheme();
  const checkboxId = useGeneratedHtmlId({ prefix: 'task-card-check' });
  const isCompleted = task.status === 'done';
  const assignees = task.assignees ?? [];
  const visibleAssignees = assignees.slice(0, 3);

  return (
    <EuiPanel
      paddingSize="s"
      hasBorder
      hasShadow={false}
      data-test-subj={`cases-tasks-card-${task.id}`}
      style={{ cursor: 'grab', marginBottom: 8 }}
    >
      <EuiFlexGroup direction="column" gutterSize="xs">
        {/* Drag handle + title */}
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            {dragHandleProps && (
              <EuiFlexItem grow={false}>
                <span
                  {...dragHandleProps}
                  aria-label="Drag to reorder"
                  style={{ cursor: 'grab', color: euiTheme.colors.textSubdued, lineHeight: 1 }}
                >
                  ⠿
                </span>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiCheckbox
                id={checkboxId}
                checked={isCompleted}
                onChange={() => onToggleComplete?.(task)}
                aria-label={isCompleted ? i18n.MARK_INCOMPLETE : i18n.MARK_COMPLETE}
                data-test-subj={`cases-tasks-card-check-${task.id}`}
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
                <strong>{task.title}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Due date */}
        {task.due_date && (
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {new Date(task.due_date).toLocaleDateString()}
            </EuiText>
          </EuiFlexItem>
        )}

        {/* Assignees + actions */}
        <EuiFlexItem>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="xs"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                {visibleAssignees.map(({ uid }) => {
                  const profile = profileMap.get(uid);
                  const displayName = profile ? getUserDisplayName(profile.user) : uid;
                  return (
                    <EuiFlexItem key={uid} grow={false}>
                      <EuiToolTip content={displayName}>
                        <EuiAvatar
                          size="s"
                          name={displayName}
                          data-test-subj={`cases-tasks-card-assignee-${uid}`}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  );
                })}
                {assignees.length > 3 && (
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      +{assignees.length - 3}
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="none" responsive={false}>
                {onEdit && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconType="pencil"
                      size="xs"
                      aria-label={i18n.EDIT_TASK}
                      onClick={() => onEdit(task)}
                      data-test-subj={`cases-tasks-card-edit-${task.id}`}
                    />
                  </EuiFlexItem>
                )}
                {onDelete && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconType="trash"
                      size="xs"
                      color="danger"
                      aria-label={i18n.DELETE_TASK}
                      onClick={() => onDelete(task.id)}
                      data-test-subj={`cases-tasks-card-delete-${task.id}`}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Sub-tasks */}
        {subTasks && subTasks.length > 0 && (
          <>
            <EuiFlexItem>
              <EuiHorizontalRule margin="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                <strong>{i18n.SUBTASKS_LABEL(subTasks.length)}</strong>
              </EuiText>
            </EuiFlexItem>
            {subTasks.map((sub) => {
              const subCheckId = `sub-check-${sub.id}`;
              const subIsCompleted = sub.status === 'done';
              return (
                <EuiFlexItem key={sub.id}>
                  <EuiFlexGroup
                    alignItems="center"
                    gutterSize="xs"
                    responsive={false}
                    style={{ paddingLeft: 8 }}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiCheckbox
                        id={subCheckId}
                        checked={subIsCompleted}
                        onChange={() => onToggleComplete?.(sub)}
                        aria-label={subIsCompleted ? i18n.MARK_INCOMPLETE : i18n.MARK_COMPLETE}
                        data-test-subj={`cases-tasks-card-check-${sub.id}`}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText
                        size="xs"
                        style={
                          subIsCompleted
                            ? {
                                textDecoration: 'line-through',
                                color: euiTheme.colors.textSubdued,
                              }
                            : undefined
                        }
                      >
                        {sub.title}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              );
            })}
          </>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
