/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
  formatDate,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { UserAvatar } from '@kbn/user-profile-components';
import type { CaseSeverity } from '../../../common/types/domain';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { useCasesContext } from '../cases_context/use_cases_context';
import { SeverityHealth } from '../severity/config';
import { TaskComments } from './task_comments';
import { isTaskFinished } from './tasks_table';
import * as i18n from './translations';

const STATUS_LABELS: Record<CaseTask['status'], string> = {
  open: i18n.STATUS_OPEN,
  in_progress: i18n.STATUS_IN_PROGRESS,
  completed: i18n.STATUS_COMPLETED,
  cancelled: i18n.STATUS_CANCELLED,
};

export interface TaskDetailFlyoutProps {
  caseId: string;
  task: CaseTask;
  onEdit: (task: CaseTask) => void;
  onClose: () => void;
}

export const TaskDetailFlyout: React.FC<TaskDetailFlyoutProps> = ({
  caseId,
  task,
  onEdit,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId();
  const { permissions } = useCasesContext();
  const uids = useMemo(() => task.assignees.map(({ uid }) => uid), [task.assignees]);
  const { data: profiles } = useBulkGetUserProfiles({ uids });

  const items = [
    {
      title: i18n.FIELD_ASSIGNEES,
      description:
        task.assignees.length === 0 ? (
          <EuiText size="s" color="subdued">
            {i18n.NO_ASSIGNEES}
          </EuiText>
        ) : (
          <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
            {task.assignees.map(({ uid }) => {
              const profile = profiles?.get(uid);
              return (
                <EuiFlexItem grow={false} key={uid}>
                  <UserAvatar user={profile?.user} avatar={profile?.data.avatar} size="s" />
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        ),
    },
    {
      title: i18n.FIELD_DUE_DATE,
      description: task.due_date ? (
        <EuiText
          size="s"
          color={
            !isTaskFinished(task) && new Date(task.due_date) < new Date() ? 'danger' : undefined
          }
        >
          {formatDate(task.due_date, 'date')}
        </EuiText>
      ) : (
        <EuiText size="s" color="subdued">
          {i18n.NO_DUE_DATE}
        </EuiText>
      ),
    },
    {
      title: i18n.FIELD_DESCRIPTION,
      description: task.description ? (
        <EuiText size="s">{task.description}</EuiText>
      ) : (
        <EuiText size="s" color="subdued">
          {i18n.NO_DESCRIPTION}
        </EuiText>
      ),
    },
  ];

  return (
    <EuiFlyout
      ownFocus
      size="m"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="cases-task-detail-flyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{task.title}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color={task.status === 'completed' ? 'success' : 'hollow'}>
              {STATUS_LABELS[task.status]}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SeverityHealth severity={task.priority as unknown as CaseSeverity} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiDescriptionList type="column" compressed listItems={items} />
        {permissions.update && (
          <>
            <EuiSpacer size="s" />
            <EuiButtonEmpty
              size="xs"
              iconType="pencil"
              flush="left"
              onClick={() => onEdit(task)}
              data-test-subj="cases-task-detail-edit"
            >
              {i18n.EDIT_TASK}
            </EuiButtonEmpty>
          </>
        )}
        <EuiHorizontalRule margin="m" />
        <TaskComments caseId={caseId} taskId={task.id} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty flush="left" onClick={onClose} data-test-subj="cases-task-detail-close">
          {i18n.CLOSE}
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

TaskDetailFlyout.displayName = 'TaskDetailFlyout';
