/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';

const humanizeAttachmentType = (type: string): string =>
  type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const getAttachmentPillLabel = (
  attachment: Pick<UnknownAttachment, 'type'>,
  uiDefinition: AttachmentUIDefinition | undefined,
  displayName: string
): string => {
  const typeLabel = uiDefinition?.getTypeLabel?.() ?? humanizeAttachmentType(attachment.type);

  if (typeLabel.toLowerCase() === displayName.toLowerCase()) {
    return displayName;
  }

  return `${typeLabel}: ${displayName}`;
};
