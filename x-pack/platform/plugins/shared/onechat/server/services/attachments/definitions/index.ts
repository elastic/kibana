/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import { createTextAttachmentType } from './text';
import { createEsqlAttachmentType } from './esql';
import { createScreenContextAttachmentType } from './screen_context';
import type { AttachmentServiceSetup } from '../types';
import { createProductReferenceAttachmentType } from './product_reference';

export const registerAttachmentTypes = ({ registry }: { registry: AttachmentServiceSetup }) => {
  const attachmentTypes: AttachmentTypeDefinition<any, any>[] = [
    createTextAttachmentType(),
    createScreenContextAttachmentType(),
    createEsqlAttachmentType(),
    createProductReferenceAttachmentType(),
  ];

  attachmentTypes.forEach((attachmentType) => {
    registry.registerType(attachmentType);
  });
};
