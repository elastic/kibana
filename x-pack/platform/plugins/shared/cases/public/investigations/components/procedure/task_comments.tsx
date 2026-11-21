/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { useItems } from '../../hooks';
import { ClaimComments } from '../claims/claim_comments';
import { MAX_TASK_COMMENTS } from './procedure_helpers';
import * as i18n from './translations';

export interface TaskCommentsProps {
  recordId: string;
  taskId: string;
  canComment: boolean;
}

/** The comments of a task. A task takes at most 100 comments, after which the composer is hidden. */
export const TaskComments: React.FC<TaskCommentsProps> = ({ recordId, taskId, canComment }) => {
  const { data } = useItems(recordId, { kind: ['comment'], target_id: taskId, per_page: 1 });
  const isFull = (data?.total ?? 0) >= MAX_TASK_COMMENTS;

  return (
    <>
      {isFull ? (
        <>
          <EuiCallOut
            announceOnMount={false}
            size="s"
            color="warning"
            title={i18n.TASK_COMMENTS_LIMIT(MAX_TASK_COMMENTS)}
            data-test-subj="investigationTaskCommentsLimit"
          />
          <EuiSpacer size="s" />
        </>
      ) : null}
      <ClaimComments recordId={recordId} claimId={taskId} canComment={canComment && !isFull} />
    </>
  );
};
TaskComments.displayName = 'TaskComments';
