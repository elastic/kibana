/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { TaskList } from '../../../../common/investigations/types';
import * as i18n from './translations';

export interface LinkedTaskListBadgesProps {
  /** Linked task list ids, in the order they are applied. */
  taskListIds: readonly string[];
  taskLists: readonly TaskList[];
  'data-test-subj'?: string;
}

/** The task lists linked to a template, in order, as badges. */
export const LinkedTaskListBadges: React.FC<LinkedTaskListBadgesProps> = ({
  taskListIds,
  taskLists,
  'data-test-subj': dataTestSubj,
}) => {
  const linked = taskListIds.flatMap((id) => taskLists.find((list) => list.id === id) ?? []);
  if (linked.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj={dataTestSubj}>
        {i18n.NO_LINKED_TASK_LISTS}
      </EuiText>
    );
  }
  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false} data-test-subj={dataTestSubj}>
      {linked.map(({ id, name }) => (
        <EuiFlexItem grow={false} key={id}>
          <EuiBadge color="hollow">{name}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
LinkedTaskListBadges.displayName = 'LinkedTaskListBadges';
