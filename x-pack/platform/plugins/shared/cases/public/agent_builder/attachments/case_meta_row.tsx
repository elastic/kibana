/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Status, type CaseStatuses } from '@kbn/cases-components';
import type { CaseAttachmentData } from '../../../common/types/agent_builder/attachment_schemas';

interface Props {
  data: CaseAttachmentData;
  showAttachments?: boolean;
}

export const CaseMetaRow: React.FC<Props> = ({ data, showAttachments }) => (
  <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
    {data.totalAlerts > 0 && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow" iconType="warning">
          {data.totalAlerts}
        </EuiBadge>
      </EuiFlexItem>
    )}
    <EuiFlexItem grow={false}>
      <Status status={data.status as CaseStatuses} />
    </EuiFlexItem>
    {data.assignees && data.assignees.length > 0 && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow" iconType="users">
          {data.assignees.length}
        </EuiBadge>
      </EuiFlexItem>
    )}
    {data.totalComment > 0 && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow" iconType="editorComment">
          {data.totalComment}
        </EuiBadge>
      </EuiFlexItem>
    )}
    {showAttachments && data.totalAttachments != null && data.totalAttachments > 0 && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow" iconType="paperClip">
          {data.totalAttachments}
        </EuiBadge>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
CaseMetaRow.displayName = 'CaseMetaRow';
