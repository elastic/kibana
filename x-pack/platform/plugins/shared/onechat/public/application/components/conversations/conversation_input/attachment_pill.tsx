/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { AttachmentType } from '@kbn/onechat-common/attachments';

const removeAriaLabel = i18n.translate('xpack.onechat.attachmentPill.removeAriaLabel', {
  defaultMessage: 'Remove attachment',
});

export interface AttachmentPillProps {
  dataTestSubj?: string;
  type: AttachmentType;
  onRemoveAttachment?: () => void;
}

const getAttachmentIcon = ({
  type,
  isHovered,
  canRemoveAttachment,
}: {
  type: AttachmentType;
  isHovered: boolean;
  canRemoveAttachment: boolean;
}): string => {
  if (canRemoveAttachment && isHovered) {
    return 'cross';
  }

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

export const AttachmentPill: React.FC<AttachmentPillProps> = ({
  dataTestSubj,
  type,
  onRemoveAttachment,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const displayName = getAttachmentDisplayName(type);
  const canRemoveAttachment = Boolean(onRemoveAttachment);
  const iconType = getAttachmentIcon({ type, isHovered, canRemoveAttachment });

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
      data-test-subj={dataTestSubj}
    >
      {displayName}
    </EuiBadge>
  );
};
