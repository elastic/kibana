/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { esqlAttachmentDefinition } from './esql_attachment';
import { textAttachmentDefinition } from './text_attachment';
import { screenContextAttachmentDefinition } from './screen_context_attachment';

export const registerAttachmentUiDefinitions = ({
  attachments,
}: {
  attachments: AttachmentServiceStartContract;
}) => {
  attachments.addAttachmentType(AttachmentType.text, textAttachmentDefinition);
  attachments.addAttachmentType(AttachmentType.screenContext, screenContextAttachmentDefinition);
  attachments.addAttachmentType(AttachmentType.esql, esqlAttachmentDefinition);
};
