/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentBoundedTool } from '../attachments';
import type { ResolverTypeDefinition } from '../resolver_definition';
import type { ExecutableTool } from './tool_provider';

/**
 * Service to access attachment types definitions.
 */
export interface AttachmentsService {
  /**
   * Returns the full definition for an attachment type
   */
  getTypeDefinition(type: string): ResolverTypeDefinition | undefined;
  /**
   * Returns the IDs of all registered attachment types.
   */
  getRegisteredTypeIds(): string[];
  /**
   * Convert an attachment-scoped tool to a generic executable tool
   */
  convertAttachmentTool(tool: AttachmentBoundedTool): ExecutableTool;
}
