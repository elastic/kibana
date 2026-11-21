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
import type { EuiButtonIconProps } from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  InvestigationItem,
  InvestigationRecord,
  TaskItem,
} from '../../../../common/investigations/types';
import { ICONS, PROPOSAL_CATEGORY_ICONS, TASK_OWNER_ICONS, TASK_STATUS_ICONS } from '../../icons';
import { RelativeTime } from '../shared';
import type { TabProps } from '../tabs/tab_props';
import { ClaimComments } from '../claims/claim_comments';
import { AssignPopover } from './assign_popover';
import {
  OWNER_TYPE_LABELS,
  STATUS_LABELS,
  getActorKindLabel,
  isTaskUnassigned,
} from './procedure_helpers';
import type { CurrentUser, EffectiveTaskStatus } from './procedure_helpers';
import * as i18n from './translations';

type Owner = TaskItem['task']['owner'];

export interface TaskRowProps {
  task: TaskItem;
  record: InvestigationRecord;
  effectiveStatus: EffectiveTaskStatus;
  dependency?: TaskItem;
  claim?: InvestigationItem;
  currentUser: CurrentUser | undefined;
  isHighlighted: boolean;
  isBusy: boolean;
  /** An agent owns the task, it has no automatic rule and the record has a conversation. */
  canRunWithAgent: boolean;
  isRunningWithAgent: boolean;
  onRunWithAgent: (task: TaskItem) => void;
  onToggleDone: (task: TaskItem) => void;
  onStart: (task: TaskItem) => void;
  onReopen: (task: TaskItem) => void;
  onSkip: (task: TaskItem) => void;
  onAssign: (task: TaskItem, owner: Owner) => void;
  onNavigateTab: TabProps['onNavigateTab'];
}

const STATUS_BADGE_COLORS: Record<
  EffectiveTaskStatus,
  'success' | 'primary' | 'danger' | 'hollow'
> = {
  todo: 'hollow',
  doing: 'primary',
  done: 'success',
  skipped: 'hollow',
  waiting: 'hollow',
  blocked: 'danger',
};

const getStatusIcon = (status: EffectiveTaskStatus): string => {
  switch (status) {
    case 'waiting':
      return ICONS.lock;
    case 'blocked':
      return ICONS.error;
    default:
      return TASK_STATUS_ICONS[status];
  }
};

const getStatusIconColor = (status: EffectiveTaskStatus): EuiButtonIconProps['color'] => {
  switch (status) {
    case 'done':
      return 'success';
    case 'doing':
      return 'primary';
    case 'blocked':
      return 'danger';
    default:
      return 'text';
  }
};

const CompletionLine: React.FC<{ task: TaskItem }> = ({ task }) => {
  const completedBy = task.task.completed_by;
  const completedAt = task.task.completed_at;
  const when = completedAt ? (
    <>
      {', '}
      <RelativeTime value={completedAt} />
    </>
  ) : null;

  if (task.status === 'done' && completedBy) {
    return (
      <EuiText size="xs" color="subdued" data-test-subj="investigationTaskCompletion">
        {i18n.COMPLETED_BY(completedBy.name, getActorKindLabel(completedBy))}
        {completedBy.on_behalf_of ? ` ${i18n.ON_BEHALF_OF(completedBy.on_behalf_of)}` : ''}
        {when}
        {task.task.note ? `. ${task.task.note}` : ''}
      </EuiText>
    );
  }
  if (task.status === 'skipped') {
    return (
      <EuiText size="xs" color="subdued" data-test-subj="investigationTaskCompletion">
        {i18n.NOT_APPLICABLE_NOTE(task.task.skip_reason ?? '')}
        {completedBy ? ` ${i18n.NOT_APPLICABLE_BY(completedBy.name)}` : ''}
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
  effectiveStatus: EffectiveTaskStatus;
  isBusy: boolean;
  onToggleDone: (task: TaskItem) => void;
  onStart: (task: TaskItem) => void;
  onReopen: (task: TaskItem) => void;
  onSkip: (task: TaskItem) => void;
}> = ({ task, effectiveStatus, isBusy, onToggleDone, onStart, onReopen, onSkip }) => {
  const menuId = useGeneratedHtmlId();
  const [isOpen, setIsOpen] = useState(false);
  const isFinished = task.status === 'done' || task.status === 'skipped';
  const run = (action: (target: TaskItem) => void) => () => {
    setIsOpen(false);
    action(task);
  };

  const items = isFinished
    ? [
        <EuiContextMenuItem
          key="reopen"
          icon={ICONS.refresh}
          onClick={run(onReopen)}
          data-test-subj="investigationTaskMenuReopen"
        >
          {i18n.REOPEN}
        </EuiContextMenuItem>,
      ]
    : [
        ...(effectiveStatus === 'todo'
          ? [
              <EuiContextMenuItem
                key="start"
                icon={TASK_STATUS_ICONS.doing}
                onClick={run(onStart)}
                data-test-subj="investigationTaskMenuStart"
              >
                {i18n.START}
              </EuiContextMenuItem>,
            ]
          : []),
        ...(effectiveStatus === 'waiting'
          ? []
          : [
              <EuiContextMenuItem
                key="done"
                icon={TASK_STATUS_ICONS.done}
                onClick={run(onToggleDone)}
                data-test-subj="investigationTaskMenuDone"
              >
                {i18n.MARK_DONE}
              </EuiContextMenuItem>,
            ]),
        <EuiContextMenuItem
          key="skip"
          icon={TASK_STATUS_ICONS.skipped}
          onClick={run(onSkip)}
          data-test-subj="investigationTaskMenuSkip"
        >
          {i18n.NOT_APPLICABLE_ACTION}
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
            aria-label={i18n.MORE_ACTIONS}
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

const TaskActions: React.FC<TaskRowProps> = ({
  task,
  record,
  effectiveStatus,
  dependency,
  currentUser,
  isBusy,
  canRunWithAgent,
  isRunningWithAgent,
  onRunWithAgent,
  onToggleDone,
  onStart,
  onReopen,
  onSkip,
  onAssign,
}) => {
  const isFinished = task.status === 'done' || task.status === 'skipped';
  const isWaiting = effectiveStatus === 'waiting';
  const waitingTitle = dependency ? i18n.FINISH_FIRST(dependency.title) : undefined;

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
      {isFinished ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType={ICONS.refresh}
            isDisabled={isBusy}
            onClick={() => onReopen(task)}
            data-test-subj={`investigationTaskReopen-${task.id}`}
          >
            {i18n.REOPEN}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : (
        <>
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
          {effectiveStatus === 'todo' ? (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                isDisabled={isBusy}
                onClick={() => onStart(task)}
                data-test-subj={`investigationTaskStart-${task.id}`}
              >
                {i18n.START}
              </EuiButton>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiToolTip content={waitingTitle}>
              <EuiButton
                size="s"
                fill
                isDisabled={isWaiting || isBusy}
                onClick={() => onToggleDone(task)}
                data-test-subj={`investigationTaskDone-${task.id}`}
              >
                {i18n.MARK_DONE}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        </>
      )}
      <EuiFlexItem grow={false}>
        <AssignPopover
          task={task}
          record={record}
          currentUser={currentUser}
          isDisabled={isBusy}
          onAssign={onAssign}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <TaskMenu
          task={task}
          effectiveStatus={effectiveStatus}
          isBusy={isBusy}
          onToggleDone={onToggleDone}
          onStart={onStart}
          onReopen={onReopen}
          onSkip={onSkip}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
TaskActions.displayName = 'TaskActions';

export const TaskRow: React.FC<TaskRowProps> = (props) => {
  const { task, effectiveStatus, dependency, claim, isHighlighted, isBusy, onNavigateTab, record } =
    props;
  const { onToggleDone, onReopen } = props;
  const { euiTheme } = useEuiTheme();
  const [showComments, setShowComments] = useState(false);
  const { owner } = task.task;
  const isFinished = task.status === 'done' || task.status === 'skipped';
  const isWaiting = effectiveStatus === 'waiting';
  const unassigned = isTaskUnassigned(task);
  const waitingTitle = dependency ? i18n.FINISH_FIRST(dependency.title) : undefined;

  const statusButton = (
    <EuiToolTip
      content={waitingTitle ?? (isFinished ? i18n.REOPEN : i18n.MARK_DONE)}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        iconType={getStatusIcon(effectiveStatus)}
        color={getStatusIconColor(effectiveStatus)}
        size="m"
        display="empty"
        isDisabled={isWaiting || isBusy}
        aria-label={isFinished ? i18n.REOPEN_ARIA(task.title) : i18n.MARK_DONE_ARIA(task.title)}
        onClick={() => (isFinished ? onReopen(task) : onToggleDone(task))}
        data-test-subj={`investigationTaskStatus-${task.id}`}
      />
    </EuiToolTip>
  );

  return (
    <div
      id={`investigation-task-${task.id}`}
      data-test-subj={`investigationTask-${task.id}`}
      data-status={effectiveStatus}
      data-highlighted={isHighlighted}
      css={css`
        padding: ${euiTheme.size.m};
        border-block-end: ${euiTheme.border.thin};
        background-color: ${isHighlighted ? euiTheme.colors.backgroundLightPrimary : 'transparent'};
        transition: background-color ${euiTheme.animation.normal} ease-out;
        &:last-child {
          border-block-end: 0;
        }
      `}
    >
      <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>{statusButton}</EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0;
          `}
        >
          <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong data-test-subj="investigationTaskTitle">{task.title}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={task.task.required ? 'warning' : 'hollow'}>
                {task.task.required ? i18n.REQUIRED : i18n.OPTIONAL}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge
                color={STATUS_BADGE_COLORS[effectiveStatus]}
                data-test-subj="investigationTaskStatusBadge"
              >
                {STATUS_LABELS[effectiveStatus]}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          {task.task.description ? (
            <EuiText size="xs" color="subdued">
              <p>{task.task.description}</p>
            </EuiText>
          ) : null}
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            wrap
            responsive={false}
            css={css`
              margin-block-start: ${euiTheme.size.xs};
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiBadge
                color="hollow"
                iconType={unassigned ? ICONS.user : TASK_OWNER_ICONS[owner.type]}
                data-test-subj="investigationTaskOwner"
              >
                {unassigned
                  ? i18n.UNASSIGNED
                  : `${owner.name ?? owner.id} · ${OWNER_TYPE_LABELS[owner.type]}`}
              </EuiBadge>
            </EuiFlexItem>
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
          <div
            css={css`
              margin-block-start: ${euiTheme.size.s};
            `}
          >
            <TaskActions {...props} />
          </div>
          <EuiButtonEmpty
            size="xs"
            iconType={ICONS.conversation}
            flush="left"
            onClick={() => setShowComments((open) => !open)}
            aria-expanded={showComments}
            data-test-subj={`investigationTaskComments-${task.id}`}
          >
            {showComments ? i18n.HIDE_COMMENTS : i18n.SHOW_COMMENTS}
          </EuiButtonEmpty>
          {showComments ? (
            <ClaimComments
              recordId={record.id}
              claimId={task.id}
              canComment={record.status !== 'closed'}
            />
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
TaskRow.displayName = 'TaskRow';
