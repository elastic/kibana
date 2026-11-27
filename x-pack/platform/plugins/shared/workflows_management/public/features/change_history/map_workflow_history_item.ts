/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChangeHistoryDetail,
  ChangeHistoryListItem,
  ChangeHistoryListItemChanges,
} from '@kbn/change-history-ui';

import type { WorkflowHistoryItem } from '../../../common/lib/workflow_change_history/types';

export interface MapWorkflowHistoryItemOptions {
  isCurrent?: boolean;
  changes?: ChangeHistoryListItemChanges;
}

export interface WorkflowChangeHistorySnapshot {
  workflow: {
    yaml: string;
  };
}

export const toWorkflowChangeHistorySnapshot = (yaml: string): WorkflowChangeHistorySnapshot => ({
  workflow: { yaml },
});

export const mapWorkflowHistoryItemToListItem = (
  item: WorkflowHistoryItem,
  { isCurrent, changes }: MapWorkflowHistoryItemOptions = {}
): ChangeHistoryListItem => ({
  id: item.id,
  timestamp: item.timestamp,
  actor: {
    name: item.user.name,
    ...(item.user.profileId ? { profileId: item.user.profileId } : {}),
  },
  action: item.action,
  ...(isCurrent ? { isCurrent: true } : {}),
  ...(item.version != null ? { metadata: { version: item.version } } : {}),
  ...(item.comment ? { comment: item.comment } : {}),
  ...(changes ? { changes } : {}),
});

export const mapWorkflowHistoryItemToDetail = (
  item: WorkflowHistoryItem,
  options: MapWorkflowHistoryItemOptions = {}
): ChangeHistoryDetail => ({
  ...mapWorkflowHistoryItemToListItem(item, options),
  snapshot: toWorkflowChangeHistorySnapshot(item.workflow.yaml),
});
