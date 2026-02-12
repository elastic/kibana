/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { AttachmentBoundedTool } from './tools';

/**
 * Server-side definition of an attachment type.
 */
export interface AttachmentTypeDefinition<
  TType extends string = string,
  TContent = unknown,
  TOrigin = unknown
> {
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
  format: (
    attachment: Attachment<TType, TContent>,
    context: AttachmentFormatContext
  ) => MaybePromise<AgentFormattedAttachment>;
  /**
   * Receives origin data and returns resolved content.
   * Only called once at add time — not on every read.
   *
   * When defined, the type supports by-reference creation:
   * consumer provides origin info → optionally validated by `validateOrigin()` →
   * `resolve()` called → content stored as `data`.
   */
  resolve?: (
    origin: TOrigin,
    context: AttachmentResolveContext
  ) => MaybePromise<TContent | undefined>;
  /**
   * Optional validation for origin/reference data.
   * Called when an attachment is created with `origin` but no `data`.
   */
  validateOrigin?: (input: unknown) => MaybePromise<AttachmentValidationResult<TOrigin>>;
  /**
   * should return the list of tools from the registry which should be exposed to the agent
   * when attachments of that type are present in the conversation.
   *
   * Should be used to expose generic tools related to the attachment type.
   *
   * E.g. the "esql" attachment type exposes the "execute_esql" tool that way.
   */
  getTools?: () => string[];
  /**
   * can be used to provide a description of the attachment type,
   * which will be exposed to the agent when attachments of that type
   * are present in the conversation.
   */
  getAgentDescription?: () => string;
  /**
   * Whether attachments of this type are read-only. Defaults to true.
   */
  isReadonly?: boolean;
}

/**
 * Context passed to the {@link AttachmentTypeDefinition.format} function.
 */
export interface AttachmentFormatContext {
  request: KibanaRequest;
  spaceId: string;
}

/**
 * Context passed to the {@link AttachmentTypeDefinition.resolve} hook.
 */
export interface AttachmentResolveContext extends AttachmentFormatContext {
  /**
   * Saved objects client scoped to the current user.
   * Optional to keep the core attachment contract generic and allow non-Kibana environments.
   */
  savedObjectsClient?: SavedObjectsClientContract;
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
  /**
   * @deprecated Representation can be inferred from attachment data; prefer returning
   * the raw data and let the formatter decide. If omitted, we will fall back to
   * stringifying the attachment data.
   */
  getRepresentation?: () => MaybePromise<AttachmentRepresentation>;
  /**
   * Can be used to expose tools which are specific to the attachment instance.
   *
   * **Important**: when multiple attachments of the same type are present in the conversation,
   * this function will be called for each of them, and all the tools will be exposed to the agent.
   * This is why:
   * - the tools should be "scoped" to the attachment instance (no id parameter for references, for example)
   * - the tool ids should be unique (so generated based on the attachment instance or attachment id)
   * - the descriptions should be explicit that they are specific to the attachment instance (specifying the attachment id for example)
   */
  getBoundedTools?: () => MaybePromise<AttachmentBoundedTool[]>;
}
