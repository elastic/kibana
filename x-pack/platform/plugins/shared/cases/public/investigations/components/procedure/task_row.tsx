/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type {
  InvestigationItem,
  InvestigationRecord,
  TaskItem,
  TaskPriority as TaskPriorityValue,
} from '../../../../common/investigations/types';
import type { CurrentUserProfile } from '../../../components/types';
import { ICONS, PROPOSAL_CATEGORY_ICONS, TASK_OWNER_ICONS } from '../../icons';
import { RelativeTime } from '../shared';
import type { TabProps } from '../tabs/tab_props';
import {
  OWNER_TYPE_LABELS,
  getActorKindLabel,
  getWorkflowRunState,
  isOwnerUnnamed,
  isTaskFinished,
  isTaskOverdue,
} from './procedure_helpers';
import type { EffectiveTaskStatus } from './procedure_helpers';
import { TaskAssignees } from './task_assignees';
import { TaskComments } from './task_comments';
import { DueDateLabel, TaskDueDate } from './task_due_date';
import { PriorityHealth, TaskPriority } from './task_priority';
import * as i18n from './translations';

export interface TaskRowHandlers {
  onToggleDone: (task: TaskItem) => void;
  onMarkInProgress: (task: TaskItem) => void;
  onReopen: (task: TaskItem) => void;
  onCancel: (task: TaskItem) => void;
  onPriorityChange: (task: TaskItem, priority: TaskPriorityValue) => void;
  onDueDateChange: (task: TaskItem, dueDate: string | null) => void;
  onAssigneesChange: (task: TaskItem, uids: string[]) => void;
  onAddSubtask: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
  onRunWorkflow: (task: TaskItem) => void;
  onRunWithAgent: (task: TaskItem) => void;
  onNavigateTab: TabProps['onNavigateTab'];
}

export interface TaskRowProps extends TaskRowHandlers {
  task: TaskItem;
  record: InvestigationRecord;
  isSubtask: boolean;
  effectiveStatus: EffectiveTaskStatus;
  dependency?: TaskItem;
  claim?: InvestigationItem;
  userProfiles: Map<string, UserProfileWithAvatar>;
  currentUserProfile: CurrentUserProfile;
  now: number;
  isHighlighted: boolean;
  isBusy: boolean;
  /** The user may change tasks (Cases update privilege). */
  canEdit: boolean;
  canAssign: boolean;
  /** A root task, the record has room for another task and the user may change tasks. */
  canAddSubtask: boolean;
  /** An agent owns the task, it has no automatic rule and the record has a conversation. */
  canRunWithAgent: boolean;
  isRunningWithAgent: boolean;
  /** Why the workflow cannot run now; null when it can. */
  workflowDisabledReason: string | null;
  /** The drag handle, when the row can be reordered. */
  dragHandle: React.ReactNode;
}

const CompletionLine: React.FC<{ task: TaskItem }> = ({ task }) => {
  const completedBy = task.task.completed_by;
  const completedAt = task.task.completed_at;
  const when = completedAt ? (
    <>
      {', '}
      <RelativeTime value={completedAt} />
    </>
  ) : null;

  if (task.status === 'completed' && completedBy) {
    return (
      <EuiText size="xs" color="subdued" data-test-subj="investigationTaskCompletion">
        {i18n.COMPLETED_BY(completedBy.name, getActorKindLabel(completedBy))}
        {completedBy.on_behalf_of ? ` ${i18n.ON_BEHALF_OF(completedBy.on_behalf_of)}` : ''}
        {when}
        {task.task.note ? `. ${task.task.note}` : ''}
      </EuiText>
    );
  }
  if (task.status === 'cancelled') {
    return (
      <EuiText size="xs" color="subdued" data-test-subj="investigationTaskCompletion">
        {i18n.CANCELLED_NOTE(task.task.cancel_reason ?? '')}
        {completedBy ? ` ${i18n.CANCELLED_BY(completedBy.name)}` : ''}
        {when}
      </EuiText>
    );
  }
  return null;
};
CompletionLine.displayName = 'CompletionLine';

const AutoRule: React.FC<{
  task: TaskItem;
  claim?: InvestigationItem;
  onNavigateTab: TabProps['onNavigateTab'];
}> = ({ task, claim, onNavigateTab }) => {
  const { auto } = task.task;
  if (auto?.type === 'claim') {
    const claimId = auto.claim_id;
    return claimId && claim ? (
      <EuiButtonEmpty
        size="xs"
        flush="left"
        iconType={ICONS.claim}
        onClick={() => onNavigateTab('overview', { itemId: claimId })}
        data-test-subj="investigationTaskClaimLink"
      >
        {i18n.COMPLETES_WHEN_SETTLED(claim.ref)}
      </EuiButtonEmpty>
    ) : (
      <EuiText size="xs" color="subdued">
        {i18n.COMPLETES_WHEN_CLAIM_SETTLED}
      </EuiText>
    );
  }
  if (auto?.type === 'action') {
    return (
      <EuiText size="xs" color="subdued" data-test-subj="investigationTaskActionRule">
        <EuiIcon type={PROPOSAL_CATEGORY_ICONS[auto.category]} size="s" aria-hidden="true" />{' '}
        {i18n.COMPLETES_WHEN_ACTION(auto.category)}
      </EuiText>
    );
  }
  return null;
};
AutoRule.displayName = 'AutoRule';

const TaskMenu: React.FC<{
  task: TaskItem;
  isSubtask: boolean;
  isBusy: boolean;
  canAddSubtask: boolean;
  onMarkInProgress: (task: TaskItem) => void;
  onReopen: (task: TaskItem) => void;
  onCancel: (task: TaskItem) => void;
  onAddSubtask: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
}> = ({
  task,
  isSubtask,
  isBusy,
  canAddSubtask,
  onMarkInProgress,
  onReopen,
  onCancel,
  onAddSubtask,
  onDelete,
}) => {
  const menuId = useGeneratedHtmlId();
  const [isOpen, setIsOpen] = useState(false);
  const isFinished = isTaskFinished(task);
  const run = (action: (target: TaskItem) => void) => () => {
    setIsOpen(false);
    action(task);
  };

  const items = [
    ...(task.status === 'open'
      ? [
          <EuiContextMenuItem
            key="progress"
            icon={ICONS.resume}
            onClick={run(onMarkInProgress)}
            data-test-subj="investigationTaskMenuInProgress"
          >
            {i18n.MARK_IN_PROGRESS}
          </EuiContextMenuItem>,
        ]
      : []),
    ...(!isFinished
      ? [
          <EuiContextMenuItem
            key="cancel"
            icon={ICONS.close}
            onClick={run(onCancel)}
            data-test-subj="investigationTaskMenuCancel"
          >
            {i18n.CANCEL_TASK}
          </EuiContextMenuItem>,
        ]
      : [
          <EuiContextMenuItem
            key="reopen"
            icon={ICONS.refresh}
            onClick={run(onReopen)}
            data-test-subj="investigationTaskMenuReopen"
          >
            {i18n.REOPEN_TASK}
          </EuiContextMenuItem>,
        ]),
    ...(!isSubtask && canAddSubtask
      ? [
          <EuiContextMenuItem
            key="subtask"
            icon={ICONS.add}
            onClick={run(onAddSubtask)}
            data-test-subj="investigationTaskMenuAddSubtask"
          >
            {i18n.ADD_SUBTASK}
          </EuiContextMenuItem>,
        ]
      : []),
    <EuiContextMenuItem
      key="delete"
      icon={ICONS.trash}
      onClick={run(onDelete)}
      data-test-subj="investigationTaskMenuDelete"
    >
      {i18n.DELETE_TASK}
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      id={menuId}
      aria-label={i18n.MORE_ACTIONS}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downRight"
      panelPaddingSize="none"
      button={
        <EuiToolTip content={i18n.MORE_ACTIONS} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType={ICONS.menu}
            color="text"
            aria-label={i18n.MORE_ACTIONS_ARIA(task.title)}
            aria-haspopup="true"
            isDisabled={isBusy}
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj={`investigationTaskMenu-${task.id}`}
          />
        </EuiToolTip>
      }
    >
      <EuiContextMenuPanel items={items} data-test-subj="investigationTaskMenuPanel" />
    </EuiPopover>
  );
};
TaskMenu.displayName = 'TaskMenu';

export const TaskRow: React.FC<TaskRowProps> = (props) => {
  const {
    task,
    record,
    isSubtask,
    effectiveStatus,
    dependency,
    claim,
    userProfiles,
    currentUserProfile,
    now,
    isHighlighted,
    isBusy,
    canEdit,
    canAssign,
    canAddSubtask,
    canRunWithAgent,
    isRunningWithAgent,
    workflowDisabledReason,
    dragHandle,
    onToggleDone,
    onMarkInProgress,
    onReopen,
    onCancel,
    onPriorityChange,
    onDueDateChange,
    onAssigneesChange,
    onAddSubtask,
    onDelete,
    onRunWorkflow,
    onRunWithAgent,
    onNavigateTab,
  } = props;
  const { euiTheme } = useEuiTheme();
  const checkboxId = useGeneratedHtmlId({ prefix: 'investigationTaskDone' });
  const [showComments, setShowComments] = useState(false);
  const { owner } = task.task;
  const isFinished = isTaskFinished(task);
  const isCompleted = task.status === 'completed';
  const isWaiting = effectiveStatus === 'waiting';
  const isOverdue = isTaskOverdue(task, now);
  const runState = getWorkflowRunState(task);
  const isRunning = runState === 'running';
  const hasWorkflow = Boolean(task.task.workflow_id);
  const waitingTitle = dependency ? i18n.FINISH_FIRST(dependency.title) : undefined;
  const checkboxTooltip = isRunning
    ? i18n.COMPLETES_WHEN_WORKFLOW_SUCCEEDS
    : isWaiting
    ? waitingTitle
    : undefined;
  const ownerName = owner.name ?? owner.id;
  const showOwner = owner.type !== 'person' || !isOwnerUnnamed(task);

  return (
    <div
      id={`investigation-task-${task.id}`}
      data-test-subj={`investigationTask-${task.id}`}
      data-status={effectiveStatus}
      data-task-status={task.status}
      data-overdue={isOverdue}
      data-subtask={isSubtask}
      data-highlighted={isHighlighted}
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        padding-inline-start: ${isSubtask ? euiTheme.size.xxxl : euiTheme.size.m};
        border-block-end: ${euiTheme.border.thin};
        background-color: ${isHighlighted
          ? euiTheme.colors.backgroundLightPrimary
          : euiTheme.colors.emptyShade};
        transition: background-color ${euiTheme.animation.normal} ease-out;
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        {dragHandle ? <EuiFlexItem grow={false}>{dragHandle}</EuiFlexItem> : null}
        {isSubtask ? (
          <EuiFlexItem grow={false}>
            <EuiIcon type={ICONS.scope} color="subdued" aria-hidden="true" />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiToolTip content={checkboxTooltip}>
            <EuiCheckbox
              id={checkboxId}
              checked={isCompleted}
              disabled={!canEdit || isBusy || isRunning || (isWaiting && !isFinished)}
              aria-label={
                isCompleted ? i18n.REOPEN_ARIA(task.title) : i18n.MARK_DONE_ARIA(task.title)
              }
              onChange={() => (isCompleted ? onReopen(task) : onToggleDone(task))}
              data-test-subj={`investigationTaskStatus-${task.id}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0;
          `}
        >
          <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong
                  data-test-subj="investigationTaskTitle"
                  css={css`
                    text-decoration: ${isFinished ? 'line-through' : 'none'};
                    color: ${isFinished ? euiTheme.colors.textSubdued : 'inherit'};
                  `}
                >
                  {task.title}
                </strong>
              </EuiText>
            </EuiFlexItem>
            {task.task.required ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning" data-test-subj="investigationTaskRequiredBadge">
                  {i18n.REQUIRED}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {task.status === 'in_progress' ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="primary" data-test-subj="investigationTaskStatusBadge">
                  {i18n.STATUS_IN_PROGRESS}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {task.status === 'cancelled' ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="investigationTaskStatusBadge">
                  {i18n.STATUS_CANCELLED}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {isWaiting ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="investigationTaskStatusBadge">
                  {i18n.STATUS_WAITING}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {effectiveStatus === 'blocked' ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="danger" data-test-subj="investigationTaskStatusBadge">
                  {i18n.STATUS_BLOCKED}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {isRunning ? (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color="primary"
                  iconType={ICONS.automation}
                  data-test-subj="investigationTaskRunningBadge"
                >
                  {i18n.WORKFLOW_RUNNING}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {runState === 'failed' ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={task.task.workflow_run?.error ?? i18n.WORKFLOW_FAILED_NO_ERROR}
                >
                  <EuiBadge
                    color="danger"
                    iconType={ICONS.error}
                    tabIndex={0}
                    data-test-subj="investigationTaskWorkflowFailedBadge"
                  >
                    {i18n.WORKFLOW_FAILED}
                  </EuiBadge>
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          {task.task.description ? (
            <EuiText size="xs" color="subdued">
              <p>{task.task.description}</p>
            </EuiText>
          ) : null}
          <EuiFlexGroup
            gutterSize="m"
            alignItems="center"
            wrap
            responsive={false}
            css={css`
              margin-block-start: ${euiTheme.size.xxs};
            `}
          >
            <EuiFlexItem grow={false}>
              {canEdit ? (
                <TaskPriority
                  priority={task.task.priority}
                  title={task.title}
                  isDisabled={isBusy}
                  onChange={(priority) => onPriorityChange(task, priority)}
                  data-test-subj={`investigationTaskPriority-${task.id}`}
                />
              ) : (
                <PriorityHealth priority={task.task.priority} />
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <TaskAssignees
                assigneeUids={task.task.assignees}
                userProfiles={userProfiles}
                currentUserProfile={currentUserProfile}
                canAssign={canEdit && canAssign}
                isLoading={isBusy}
                onChange={(uids) => onAssigneesChange(task, uids)}
                data-test-subj={`investigationTaskAssignees-${task.id}`}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {canEdit ? (
                <TaskDueDate
                  dueDate={task.task.due_date}
                  isOverdue={isOverdue}
                  title={task.title}
                  isDisabled={isBusy}
                  onChange={(dueDate) => onDueDateChange(task, dueDate)}
                  data-test-subj={`investigationTaskDue-${task.id}`}
                />
              ) : task.task.due_date ? (
                <DueDateLabel dueDate={task.task.due_date} isOverdue={isOverdue} />
              ) : null}
            </EuiFlexItem>
            {showOwner ? (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color="hollow"
                  iconType={TASK_OWNER_ICONS[owner.type]}
                  data-test-subj="investigationTaskOwner"
                >
                  {ownerName
                    ? `${ownerName} · ${OWNER_TYPE_LABELS[owner.type]}`
                    : OWNER_TYPE_LABELS[owner.type]}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <AutoRule task={task} claim={claim} onNavigateTab={onNavigateTab} />
            </EuiFlexItem>
            {dependency ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued" data-test-subj="investigationTaskDependency">
                  {i18n.AFTER(dependency.title)}
                </EuiText>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          {isWaiting && dependency ? (
            <EuiText size="xs" color="subdued" data-test-subj="investigationTaskWaiting">
              {i18n.WAITS_FOR(dependency.title)}
            </EuiText>
          ) : null}
          {effectiveStatus === 'blocked' && claim ? (
            <EuiText size="xs" color="danger" data-test-subj="investigationTaskBlocked">
              {i18n.BLOCKED_BECAUSE(claim.ref)}
            </EuiText>
          ) : null}
          <CompletionLine task={task} />
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            wrap
            responsive={false}
            css={css`
              margin-block-start: ${euiTheme.size.xs};
            `}
          >
            {canEdit && hasWorkflow && !isFinished ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={workflowDisabledReason ?? undefined}>
                  <EuiButton
                    size="s"
                    iconType={ICONS.resume}
                    isLoading={isRunning}
                    isDisabled={isBusy || isRunning || workflowDisabledReason !== null}
                    aria-label={i18n.RUN_WORKFLOW_ARIA(task.title)}
                    onClick={() => onRunWorkflow(task)}
                    data-test-subj={`investigationTaskRunWorkflow-${task.id}`}
                  >
                    {i18n.RUN_WORKFLOW}
                  </EuiButton>
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
            {canRunWithAgent && !isWaiting ? (
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  iconType={ICONS.agent}
                  isLoading={isRunningWithAgent}
                  isDisabled={isBusy}
                  onClick={() => onRunWithAgent(task)}
                  data-test-subj={`investigationTaskRunWithAgent-${task.id}`}
                >
                  {isRunningWithAgent ? i18n.RUNNING_WITH_AGENT : i18n.RUN_WITH_AGENT}
                </EuiButton>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType={ICONS.conversation}
                onClick={() => setShowComments((open) => !open)}
                aria-expanded={showComments}
                data-test-subj={`investigationTaskComments-${task.id}`}
              >
                {showComments ? i18n.HIDE_COMMENTS : i18n.SHOW_COMMENTS}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          {showComments ? (
            <TaskComments
              recordId={record.id}
              taskId={task.id}
              canComment={record.status !== 'closed'}
            />
          ) : null}
        </EuiFlexItem>
        {canEdit ? (
          <EuiFlexItem grow={false}>
            <TaskMenu
              task={task}
              isSubtask={isSubtask}
              isBusy={isBusy}
              canAddSubtask={canAddSubtask}
              onMarkInProgress={onMarkInProgress}
              onReopen={onReopen}
              onCancel={onCancel}
              onAddSubtask={onAddSubtask}
              onDelete={onDelete}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </div>
  );
};
TaskRow.displayName = 'TaskRow';
