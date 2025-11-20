/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { Attachment } from '@kbn/onechat-common/attachments';

/**
 * Server-side definition of an attachment type.
 */
export interface AttachmentTypeDefinition<TType extends string = string, TContent = unknown> {
  /**
   * Unique identifier for the attachment type to register.
   */
  id: TType;
  /**
   * validation function, which will be called when the attachment is added to the conversation.
   */
  validate: (input: unknown) => MaybePromise<AttachmentValidationResult<TContent>>;
  /**
   * format the attachment to presented to the LLM
   */
  format: (attachment: Attachment<TType, TContent>) => MaybePromise<AgentFormattedAttachment>;
  /**
   * should return the list of tools which should be exposed to the agent
   * when attachments of that type are present in the conversation.
   */
  getTools?: () => string[];
  /**
   * can be used to provide a description of the attachment type,
   * which will be exposed to the agent when attachments of that type
   * are present in the conversation.
   */
  getAgentDescription?: () => string;
}

/**
 * Return type for attachment's validation handlers.
 * Refer to {@link InlineAttachmentTypeDefinition.validate}
 */
export type AttachmentValidationResult<TValidatedData = unknown> =
  /** valid attachment */
  | { valid: true; data: TValidatedData }
  /** validation failed */
  | { valid: false; error: string };

/**
 * Text representation of an attachment when exposed to the LLM.
 */
export interface TextAttachmentRepresentation {
  type: 'text';
  /**
   * Plain text representation of the attachment.
   * Can either be text, markdown, json, xml...
   */
  value: string;
}

/**
 * Representation of an attachment when exposed to the LLM.
 *
 * Only plain text (inlined into the message) is supported for now.
 */
export type AttachmentRepresentation = TextAttachmentRepresentation;

/**
 * Structure containing all methods which will be used to present the attachment to the agent.
 */
export interface AgentFormattedAttachment {
  /**
   * Should return the representation of the attachment, which will be presented to the agent.
   */
  getRepresentation: () => MaybePromise<AttachmentRepresentation>;
}
