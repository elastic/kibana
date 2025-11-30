/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AttachmentType } from '@kbn/onechat-common/attachments';

export interface AttachmentPillProps {
  /** Unique identifier for the attachment */
  id: string;
  /** Type of the attachment (e.g., 'text', 'screen_context', 'dashboard') */
  type: AttachmentType;
  /** Display name for the attachment */
  name?: string;
  /** Optional callback when the attachment is removed */
  onRemove?: (id: string) => void;
}

const labels = {
  removeAttachment: i18n.translate('xpack.onechat.attachmentPill.removeAttachment', {
    defaultMessage: 'Remove attachment',
  }),
};

/**
 * Gets an icon type based on the attachment type.
 */
const getAttachmentIcon = (type: string): string => {
  switch (type) {
    case AttachmentType.text:
      return 'document';
    case AttachmentType.screenContext:
      return 'inspect';
    case AttachmentType.esql:
      return 'editorCodeBlock';
    default:
      return 'document';
  }
};

/**
 * Gets a display name for the attachment based on its type if no name is provided.
 */
const getAttachmentDisplayName = (type: string, name?: string): string => {
  if (name) {
    return name;
  }

  switch (type) {
    case AttachmentType.text:
      return i18n.translate('xpack.onechat.attachmentPill.textAttachment', {
        defaultMessage: 'Text',
      });
    case AttachmentType.screenContext:
      return i18n.translate('xpack.onechat.attachmentPill.screenContextAttachment', {
        defaultMessage: 'Screen context',
      });
    case AttachmentType.esql:
      return i18n.translate('xpack.onechat.attachmentPill.esqlAttachment', {
        defaultMessage: 'ES|QL query',
      });
    default:
      return type;
  }
};

/**
 * A pill component for displaying an attachment.
 * Can optionally be made removable by providing an onRemove callback.
 */
export const AttachmentPill: React.FC<AttachmentPillProps> = ({ id, type, name, onRemove }) => {
  const displayName = getAttachmentDisplayName(type, name);
  const iconType = getAttachmentIcon(type);

  const handleClose = onRemove
    ? (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        onRemove(id);
      }
    : undefined;

  return (
    <EuiBadge
      color="default"
      iconType={iconType}
      iconSide="left"
      onClickAriaLabel={handleClose ? labels.removeAttachment : undefined}
      iconOnClick={handleClose}
      iconOnClickAriaLabel={handleClose ? labels.removeAttachment : undefined}
      data-test-subj={`onechatAttachmentPill-${id}`}
    >
      {displayName}
    </EuiBadge>
  );
};
