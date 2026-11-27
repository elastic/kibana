/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { createFileUploadAttachmentType } from './file_upload_attachment_type';
import { createFileUploadSkill } from './file_upload_skill';

/** Agent Builder definitions for the file upload card, registered by a consuming plugin. */
export interface FileUploadAgentBuilderDefinitions {
  attachmentType: AttachmentTypeDefinition;
  skill: SkillDefinition;
}

export const createFileUploadAgentBuilderDefinitions = ({
  getEsClient,
  logger,
}: {
  getEsClient: (request: KibanaRequest) => Promise<ElasticsearchClient>;
  logger: Logger;
}): FileUploadAgentBuilderDefinitions => ({
  // The registry is typed for the erased definition, so the narrowed one needs a cast.
  attachmentType: createFileUploadAttachmentType({
    getEsClient,
    logger,
  }) as unknown as AttachmentTypeDefinition,
  skill: createFileUploadSkill(),
});
