/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { Attachment } from '@kbn/onechat-common/attachments';
import { useOnechatServices } from '../../../hooks/use_onechat_service';

const removeAriaLabel = i18n.translate('xpack.onechat.attachmentPill.removeAriaLabel', {
  defaultMessage: 'Remove attachment',
});

const viewAriaLabel = i18n.translate('xpack.onechat.attachmentPill.viewAriaLabel', {
  defaultMessage: 'View attachment',
});

export interface AttachmentPillProps {
  attachment: Attachment;
  onRemoveAttachment?: () => void;
  onClick?: () => void;
}

const DEFAULT_ICON = 'document';
const REMOVE_ICON = 'cross';

const clickableStyles = css`
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;

export const AttachmentPill: React.FC<AttachmentPillProps> = ({
  attachment,
  onRemoveAttachment,
  onClick,
}) => {
  const { attachmentsService } = useOnechatServices();
  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);
  const [isHovered, setIsHovered] = useState(false);

  const displayName = uiDefinition?.getLabel(attachment) ?? attachment.type;
  const canRemoveAttachment = Boolean(onRemoveAttachment);
  const isClickable = Boolean(onClick);
  const defaultIconType = uiDefinition?.getIcon?.() ?? DEFAULT_ICON;
  const iconType = canRemoveAttachment && isHovered ? REMOVE_ICON : defaultIconType;

  // Handle click - wrap to add logging
  const handleClick = onClick
    ? () => {
        console.log('[AttachmentPill] Click handler called for:', attachment.id);
        onClick();
      }
    : undefined;

  // Only set icon click handlers when removal is enabled
  const iconClickProps = canRemoveAttachment
    ? {
        iconOnClick: () => onRemoveAttachment?.(),
        iconOnClickAriaLabel: removeAriaLabel,
      }
    : {};

  // Note: EuiBadge requires onClickAriaLabel when onClick is provided
  const clickProps = handleClick
    ? {
        onClick: handleClick,
        onClickAriaLabel: viewAriaLabel,
      }
    : {};

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
      css={isClickable ? clickableStyles : undefined}
      data-test-subj={`onechatAttachmentPill-${attachment.id}`}
      {...clickProps}
      {...iconClickProps}
    >
      {displayName}
    </EuiBadge>
  );
};
