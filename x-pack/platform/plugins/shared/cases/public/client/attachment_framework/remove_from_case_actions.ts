/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionsConfig } from '@kbn/response-ops-alerts-table/types';
import type { CommonAttachmentListViewProps } from './types';

export interface RemoveFromCaseActions {
  /** Removes the selected rows, by their `_id`, and clears the selection on success. */
  bulkAction: BulkActionsConfig;
  /** Removes 1 row, by its `_id`. */
  onRemoveFromCase: (id: string) => void;
}

interface GetRemoveFromCaseActionsArgs {
  onRemove: CommonAttachmentListViewProps['onRemove'];
  /** Bulk action key, also used as its `data-test-subj`. */
  key: string;
  label: string;
}

/** Builds the "Remove from case" bulk and row actions for an alerts table hosted in a case tab. */
export const getRemoveFromCaseActions = ({
  onRemove,
  key,
  label,
}: GetRemoveFromCaseActionsArgs): RemoveFromCaseActions | undefined => {
  if (!onRemove) {
    return undefined;
  }

  return {
    bulkAction: {
      key,
      label,
      icon: 'trash',
      groupId: 'caseRemoval',
      'data-test-subj': key,
      // "Select all" also matches alerts that the table's time range hides.
      disableOnQuery: true,
      onClick: (alerts, _isAllSelected, _setIsBulkActionsLoading, clearSelection) =>
        onRemove({ attachmentIds: alerts.map(({ _id }) => _id) }, { onSuccess: clearSelection }),
    },
    onRemoveFromCase: (id) => onRemove({ attachmentIds: [id] }),
  };
};
