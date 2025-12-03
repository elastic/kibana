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

const removeAriaLabel = i18n.translate('xpack.onechat.attachmentPill.removeAriaLabel', {
  defaultMessage: 'Remove attachment',
});

export interface AttachmentPillProps {
  id: string;
  type: AttachmentType;
  onRemoveAttachment?: () => void;
}

const getAttachmentIcon = (type: AttachmentType): string => {
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

const getAttachmentDisplayName = (type: AttachmentType): string => {
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

export const AttachmentPill: React.FC<AttachmentPillProps> = ({ id, type, onRemoveAttachment }) => {
  const displayName = getAttachmentDisplayName(type);
  const canRemoveAttachment = Boolean(onRemoveAttachment);
  const iconType = canRemoveAttachment ? 'cross' : getAttachmentIcon(type);

  return (
    <EuiBadge
      color="default"
      iconType={iconType}
      iconSide={canRemoveAttachment ? 'right' : 'left'}
      iconOnClick={() => {
        onRemoveAttachment?.();
      }}
      iconOnClickAriaLabel={canRemoveAttachment ? removeAriaLabel : undefined}
      data-test-subj={`onechatAttachmentPill-${id}`}
    >
      {displayName}
    </EuiBadge>
  );
};
