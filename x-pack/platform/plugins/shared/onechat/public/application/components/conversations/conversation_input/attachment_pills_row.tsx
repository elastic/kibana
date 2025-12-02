/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadgeGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AttachmentType } from '@kbn/onechat-common/attachments';
import { AttachmentPill } from './attachment_pill';

export interface AttachmentPillsRowProps {
  attachments: Array<{ id: string; type: AttachmentType; hidden?: boolean }>;
}

const labels = {
  attachments: i18n.translate('xpack.onechat.attachmentPillsRow.attachments', {
    defaultMessage: 'Attachments',
  }),
};

export const AttachmentPillsRow: React.FC<AttachmentPillsRowProps> = ({ attachments }) => {
  const visibleAttachments = attachments.filter((attachment) => !attachment.hidden);

  if (visibleAttachments.length === 0) {
    return null;
  }

  return (
    <EuiBadgeGroup
      gutterSize="s"
      role="list"
      aria-label={labels.attachments}
      data-test-subj="onechatAttachmentPillsRow"
    >
      {visibleAttachments.map((attachment) => (
        <AttachmentPill key={attachment.id} id={attachment.id} type={attachment.type} />
      ))}
    </EuiBadgeGroup>
  );
};
