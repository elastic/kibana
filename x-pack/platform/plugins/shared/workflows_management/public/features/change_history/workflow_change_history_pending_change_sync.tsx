/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutableRefObject } from 'react';
import React from 'react';
import type { ChangeHistoryPendingChange } from '@kbn/change-history-ui';
import { useChangeHistoryModal } from '@kbn/change-history-ui';

import {
  useWorkflowPendingChangeDetails,
  useWorkflowPendingChangeMetadata,
} from './use_workflow_pending_change';

export interface WorkflowChangeHistoryPendingChangeSyncProps {
  pendingChangeRef: MutableRefObject<ChangeHistoryPendingChange | undefined>;
}

const WorkflowChangeHistoryPendingChangeDetails = ({
  metadata,
  pendingChangeRef,
}: {
  metadata: ReturnType<typeof useWorkflowPendingChangeMetadata>;
  pendingChangeRef: MutableRefObject<ChangeHistoryPendingChange | undefined>;
}): null => {
  const pendingChange = useWorkflowPendingChangeDetails(metadata);
  pendingChangeRef.current = pendingChange;

  return null;
};

/** Keeps adapter pending state in sync only while the history modal is open. */
export const WorkflowChangeHistoryPendingChangeSync = ({
  pendingChangeRef,
}: WorkflowChangeHistoryPendingChangeSyncProps): JSX.Element | null => {
  const { isOpen } = useChangeHistoryModal();
  const metadata = useWorkflowPendingChangeMetadata();

  if (!isOpen) {
    pendingChangeRef.current = undefined;
    return null;
  }

  return (
    <WorkflowChangeHistoryPendingChangeDetails
      metadata={metadata}
      pendingChangeRef={pendingChangeRef}
    />
  );
};
