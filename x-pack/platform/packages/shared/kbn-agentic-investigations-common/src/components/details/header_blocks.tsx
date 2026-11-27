/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { InfoBlockItem } from '@kbn/flyout-info-blocks';
import { AssigneeAvatarStack } from '../escalation_queue/assignee_avatar_stack';
import { getEmptyValue } from '../helpers';
import { TEMPLATE_UI_LABELS } from '../../template_ui/translations';

export interface HeaderBlockValues {
  status?: string;
  /**
   * Pre-rendered interactive status widget from the consuming plugin (e.g. a toggle).
   * Falls back to a read-only badge when absent.
   */
  statusNode?: React.ReactNode;
  /** Pre-rendered assignee content. Falls back to a read-only avatar stack when absent. */
  assigneesNode?: React.ReactNode;
  /** Fallback assignee uid list used to render read-only avatars when `assigneesNode` is absent. */
  assigneeUids?: readonly string[];
  /** Pre-rendered severity widget. Adds a severity tile when present. */
  severityNode?: React.ReactNode;
}

const getStatusValue = ({ status, statusNode }: HeaderBlockValues): React.ReactNode => {
  if (statusNode !== undefined) {
    return statusNode;
  }
  return (
    <EuiBadge color={status === 'open' ? 'primary' : 'hollow'}>
      {status ?? getEmptyValue()}
    </EuiBadge>
  );
};

const getAssigneesValue = ({
  assigneesNode,
  assigneeUids = [],
}: HeaderBlockValues): React.ReactNode => {
  if (assigneesNode !== undefined) {
    return assigneesNode;
  }
  if (assigneeUids.length === 0) {
    return TEMPLATE_UI_LABELS.noAssignees;
  }
  const profiles = assigneeUids.map((uid) => ({
    uid,
    enabled: true as const,
    user: { username: uid },
    data: {},
  }));
  return <AssigneeAvatarStack profiles={profiles} />;
};

/**
 * The status, severity (when supplied) and assignee tiles shown above the flyout tabs. Takes either
 * a pre-rendered `assigneesNode` (interactive picker from the consuming plugin) or a list of uids
 * to show as a read-only avatar stack.
 */
export const getHeaderBlocks = (values: HeaderBlockValues): InfoBlockItem[] => [
  { id: 'status', title: TEMPLATE_UI_LABELS.status, value: getStatusValue(values) },
  ...(values.severityNode !== undefined
    ? [{ id: 'severity', title: TEMPLATE_UI_LABELS.severity, value: values.severityNode }]
    : []),
  { id: 'assignees', title: TEMPLATE_UI_LABELS.assignees, value: getAssigneesValue(values) },
];
