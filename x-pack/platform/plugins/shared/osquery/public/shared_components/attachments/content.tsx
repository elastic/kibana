/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public';
import type { OsqueryAttachmentPayload } from '../../../common/cases/attachments/schema';
import { PackQueriesAttachmentWrapper } from './pack_queries_attachment_wrapper';

type Props = UnifiedReferenceAttachmentViewProps<OsqueryAttachmentPayload['metadata']>;

const AttachmentContent = ({ attachmentId, metadata }: Props) => {
  if (!metadata || typeof attachmentId !== 'string') {
    return null;
  }

  const { agentIds, queryId, scheduleId, executionCount } = metadata;

  return (
    <EuiFlexGroup data-test-subj="osquery-attachment-content">
      <EuiFlexItem>
        <PackQueriesAttachmentWrapper
          actionId={attachmentId}
          queryId={queryId}
          agentIds={agentIds}
          scheduleId={scheduleId}
          executionCount={executionCount}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default AttachmentContent;
