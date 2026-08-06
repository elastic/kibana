/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { createAiIndexAttachmentType } from './ai_index';

export const registerAttachmentTypes = (agentBuilder: AgentBuilderPluginSetup) => {
  const attachmentType: AttachmentTypeDefinition =
    createAiIndexAttachmentType() as AttachmentTypeDefinition;
  agentBuilder.attachments.registerType(attachmentType);
};
