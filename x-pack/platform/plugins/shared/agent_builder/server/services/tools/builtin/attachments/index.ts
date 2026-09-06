/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attachmentTools } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createAttachmentReadTool } from './attachment_read';
import { createAttachmentUpdateTool } from './attachment_update';
import { createAttachmentAddTool } from './attachment_add';
import { createAttachmentListTool } from './attachment_list';
import { createAttachmentDiffTool } from './attachment_diff';
import type { AttachmentToolsOptions } from './types';

export type { AttachmentToolsOptions } from './types';

/**
 * All attachment tool IDs.
 */
export const attachmentToolIds = [
  attachmentTools.read,
  attachmentTools.update,
  attachmentTools.add,
  attachmentTools.list,
  attachmentTools.diff,
] as const;

/**
 * Creates all attachment tools with the given options.
 */
export const createAttachmentTools = (
  options: AttachmentToolsOptions
): BuiltinToolDefinition<any>[] => {
  return [
    createAttachmentReadTool(options),
    createAttachmentUpdateTool(options),
    createAttachmentAddTool(options),
    createAttachmentListTool(options),
    createAttachmentDiffTool(options),
  ];
};
