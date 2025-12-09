/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';

const removeAriaLabel = i18n.translate('xpack.agentBuilder.attachmentPill.removeAriaLabel', {
  defaultMessage: 'Remove attachment',
});

export interface AttachmentPillProps {
  attachment: Attachment;
  onRemoveAttachment?: () => void;
}

const DEFAULT_ICON = 'document';
const REMOVE_ICON = 'cross';

export const AttachmentPill: React.FC<AttachmentPillProps> = ({
  attachment,
  onRemoveAttachment,
}) => {
  const { attachmentsService } = useAgentBuilderServices();
  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);
  const [isHovered, setIsHovered] = useState(false);

  const displayName = uiDefinition?.getLabel(attachment) ?? attachment.type;
  const canRemoveAttachment = Boolean(onRemoveAttachment);
  const defaultIconType = uiDefinition?.getIcon?.() ?? DEFAULT_ICON;
  const iconType = canRemoveAttachment && isHovered ? REMOVE_ICON : defaultIconType;

  return (
    <EuiBadge
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      color="default"
      iconType={iconType}
      iconSide="left"
      iconOnClick={() => {
        onRemoveAttachment?.();
      }}
      iconOnClickAriaLabel={canRemoveAttachment ? removeAriaLabel : undefined}
      data-test-subj={`agentBuilderAttachmentPill-${attachment.id}`}
    >
      {displayName}
    </EuiBadge>
  );
};
