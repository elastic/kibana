/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiEmptyPrompt, EuiPanel, useEuiTheme } from '@elastic/eui';
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
  const { euiTheme } = useEuiTheme();

  const groups = useMemo(() => groupAttachments(attachments, ATTACHMENT_GROUPS), [attachments]);

  if (groups.length === 0) {
    return <EuiEmptyPrompt title={<h3>{ATTACHMENTS_EMPTY_MESSAGE}</h3>} />;
  }

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      css={css({
        borderRadius: euiTheme.size.s,
        overflow: 'hidden',
        '& > *:not(:first-child)': { borderTop: euiTheme.border.thin },
      })}
      data-test-subj="attachmentsTabPanel"
    >
      {groups.map((group) => (
        <RenderAttachmentGroupList
          key={group.id}
          group={group}
          attachmentsService={attachmentsService}
        />
      ))}
    </EuiPanel>
  );
});

AttachmentsTab.displayName = 'AttachmentsTab';
