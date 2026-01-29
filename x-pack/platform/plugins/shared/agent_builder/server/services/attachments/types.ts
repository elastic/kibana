/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { ValidateAttachmentResult } from './validate_attachment';
import type { AttachmentTypeExtension, MergedAttachmentTypeDefinition } from './attachment_type_registry';

export interface AttachmentServiceSetup {
  /**
   * Register a new attachment type (platform use).
   */
  registerType(attachmentType: AttachmentTypeDefinition): void;

  /**
   * Extend an existing attachment type with additional skills, tools, or content.
   * This allows solutions to add their own capabilities to platform attachment types.
   *
   * @example
   * // In security_solution plugin setup
   * agentBuilder.attachments.extendType('alert', {
   *   skills: ['security.alert_triage', 'security.detection_rules'],
   *   skillContent: '## Security Alert Investigation\n...',
   * });
   */
  extendType(attachmentTypeId: string, extension: AttachmentTypeExtension): void;
}

export interface AttachmentServiceStart {
  validate<Type extends string, Data>(
    attachment: AttachmentInput<Type, Data>
  ): Promise<ValidateAttachmentResult<Type, Data>>;

  /**
   * Get the base type definition (without extensions).
   */
  getTypeDefinition(type: string): AttachmentTypeDefinition | undefined;

  /**
   * Get the merged type definition (with all extensions applied).
   */
  getMergedTypeDefinition(type: string): MergedAttachmentTypeDefinition | undefined;
}
