/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge } from '@elastic/eui';
import { InfoBlocks, type InfoBlockItem } from '@kbn/flyout-info-blocks';
import { AssigneeAvatarStack } from '../escalation_queue/assignee_avatar_stack';
import { getEmptyValue } from '../helpers';
import { TEMPLATE_UI_LABELS } from '../../template_ui/translations';

export interface ConversationHeaderBlocksProps {
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
  'data-test-subj'?: string;
}

/**
 * Status and assignee tiles shown above the flyout tabs.
 *
 * Accepts either a fully pre-rendered `assigneesNode` (interactive picker from the
 * consuming plugin) or a list of uid strings to render as a read-only avatar stack.
 */
export const ConversationHeaderBlocks = ({
  status,
  statusNode,
  assigneesNode,
  assigneeUids = [],
  'data-test-subj': dataTestSubj = 'investigationHeaderBlocks',
}: ConversationHeaderBlocksProps) => {
  const assigneesValue = useMemo<React.ReactNode>(() => {
    if (assigneesNode !== undefined) {
      return assigneesNode;
    }
    if (assigneeUids.length === 0) {
      return null;
    }
    const profiles = assigneeUids.map((uid) => ({
      uid,
      enabled: true as const,
      user: { username: uid },
      data: {},
    }));
    return <AssigneeAvatarStack profiles={profiles} />;
  }, [assigneesNode, assigneeUids]);

  const statusValue = useMemo<React.ReactNode>(() => {
    if (statusNode !== undefined) {
      return statusNode;
    }
    return (
      <EuiBadge color={status === 'open' ? 'primary' : 'hollow'}>
        {status ?? getEmptyValue()}
      </EuiBadge>
    );
  }, [status, statusNode]);

  const items = useMemo<InfoBlockItem[]>(
    () => [
      {
        id: 'status',
        title: TEMPLATE_UI_LABELS.status,
        value: statusValue,
      },
      {
        id: 'assignees',
        title: TEMPLATE_UI_LABELS.assignees,
        value: assigneesValue,
      },
    ],
    [statusValue, assigneesValue]
  );

  return <InfoBlocks items={items} maxColumns={2} data-test-subj={dataTestSubj} />;
};
