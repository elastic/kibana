/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { EuiCard, EuiIcon, useEuiTheme } from '@elastic/eui';
import React, { useCallback } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { useAttachmentCartActivation } from './use_attachment_cart_activation';

const GROUP_ATTACHMENT_TYPE = 'group';
const DEFAULT_ICON = 'document';
const GROUP_ICON = 'boxesVertical';

export interface AttachmentCartCardProps {
  attachment: UnknownAttachment;
}

export const AttachmentCartCard: React.FC<AttachmentCartCardProps> = ({ attachment }) => {
  const { attachmentsService } = useAgentBuilderServices();
  const { activateAttachment } = useAttachmentCartActivation();
  const { euiTheme } = useEuiTheme();

  const isGroupAttachment = attachment.type === GROUP_ATTACHMENT_TYPE;
  const uiDefinition = !isGroupAttachment
    ? attachmentsService.getAttachmentUiDefinition(attachment.type)
    : null;

  const isActivatable =
    uiDefinition != null &&
    (uiDefinition.getActionButtons !== undefined || uiDefinition.renderCanvasContent !== undefined);

  const groupLabel =
    isGroupAttachment && typeof attachment.data === 'object' && attachment.data !== null
      ? (attachment.data as { label?: string }).label
      : undefined;

  const displayName = isGroupAttachment
    ? groupLabel ?? attachment.type
    : uiDefinition?.getLabel(attachment) ?? attachment.type;

  const iconType = isGroupAttachment ? GROUP_ICON : uiDefinition?.getIcon?.() ?? DEFAULT_ICON;

  const subtitle = !isGroupAttachment
    ? uiDefinition?.getHeader?.({ attachment })?.subtitle
    : undefined;

  const handleActivate = useCallback(() => {
    if (!isActivatable) {
      return;
    }
    activateAttachment(attachment);
  }, [activateAttachment, attachment, isActivatable]);

  return (
    <EuiCard
      hasBorder
      display="plain"
      textAlign="left"
      titleSize="xs"
      titleElement="h4"
      title={displayName}
      description={subtitle}
      icon={<EuiIcon type={iconType} size="l" color="subdued" aria-hidden={true} />}
      onClick={isActivatable ? handleActivate : undefined}
      data-test-subj={`agentBuilderAttachmentCartCard-${attachment.id}`}
    />
  );
};
