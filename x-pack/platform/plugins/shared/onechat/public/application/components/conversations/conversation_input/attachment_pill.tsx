/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import type { Attachment } from '@kbn/onechat-common/attachments';
import { useOnechatServices } from '../../../hooks/use_onechat_service';

export interface AttachmentPillProps {
  attachment: Attachment;
}

const DEFAULT_ICON = 'document';

export const AttachmentPill: React.FC<AttachmentPillProps> = ({ attachment }) => {
  const { attachmentsService } = useOnechatServices();
  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);

  const displayName = uiDefinition?.getLabel(attachment) ?? attachment.type;
  const iconType = uiDefinition?.getIcon?.() ?? DEFAULT_ICON;

  return (
    <EuiBadge
      color="default"
      iconType={iconType}
      iconSide="left"
      data-test-subj={`onechatAttachmentPill-${attachment.id}`}
    >
      {displayName}
    </EuiBadge>
  );
};
