/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { groupAttachments } from './group_attachments';
import { ATTACHMENT_GROUPS } from './attachment_groups';
import { RenderAttachmentGroupList } from './render_attachment_group_list';
import { ATTACHMENTS_EMPTY_MESSAGE } from './translations';

export interface AttachmentsTabProps {
  attachments: VersionedAttachment[] | undefined;
  attachmentsService: AttachmentServiceStartContract;
}

/**
 * The Attachments tab body. Lists every active, non-hidden attachment grouped by type.
 * Known groups appear first; unknown types form their own ad-hoc group at the end.
 */
export const AttachmentsTab = memo<AttachmentsTabProps>(({ attachments, attachmentsService }) => {
  const groups = useMemo(() => groupAttachments(attachments, ATTACHMENT_GROUPS), [attachments]);

  if (groups.length === 0) {
    return <EuiEmptyPrompt title={<h3>{ATTACHMENTS_EMPTY_MESSAGE}</h3>} />;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      responsive={false}
      data-test-subj="attachmentsTabPanel"
    >
      {groups.map((group) => (
        <EuiFlexItem key={group.id} grow={false}>
          <RenderAttachmentGroupList group={group} attachmentsService={attachmentsService} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
});

AttachmentsTab.displayName = 'AttachmentsTab';
