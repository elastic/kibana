/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import type { AttachmentTypeRegistry } from '../attachment_type_registry';
import { createTextAttachmentType } from './text';
import { createScreenContextAttachmentType } from './screen_context';

export const registerAttachmentTypes = ({ registry }: { registry: AttachmentTypeRegistry }) => {
  const attachmentTypes: AttachmentTypeDefinition<any>[] = [
    createTextAttachmentType(),
    createScreenContextAttachmentType(),
  ];

  attachmentTypes.forEach((attachmentType) => {
    registry.register(attachmentType);
  });
};
