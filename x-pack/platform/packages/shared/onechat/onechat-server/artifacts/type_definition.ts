/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';

export type AttachmentParseResult<TResult = unknown> =
  | { valid: true; data: TResult }
  | { valid: false; error: string };

/**
 * Text representation of an attachment when exposed to the LLM.
 */
export interface TextAttachmentRepresentation {
  type: 'text';
  value: string;
}

/**
 * Representation of an attachment when exposed to the LLM.
 *
 * Only plain text (inlined into the message) is supported for now.
 */
export type AttachmentRepresentation = TextAttachmentRepresentation;

/**
 * Server-side definition of an inline attachment type.
 *
 * Inline attachments are self-contained in the payload.
 */
export interface InlineAttachmentTypeDefinition<TContent = unknown> {
  /** the type of attachment to register  */
  id: string;
  /** Inline attachment type - the content is embedded  */
  type: 'inline';
  /** validation function, used to validate the input when attachment is added to a conversation */
  validate: (input: unknown) => MaybePromise<AttachmentParseResult<TContent>>;
  /** format the attachment to presented to the LLM */
  format: (input: TContent) => MaybePromise<AttachmentRepresentation>;
  /** Check if the attachment is different from the previous one */
  // TODO: later
  // getDelta: (a: unknown, b: unknown) => MaybePromise<unknown>;
}

/**
 * Server-side definition of a reference attachment type.
 *
 * Reference attachments are referencing an external resource.
 */
export interface ReferenceAttachmentTypeDefinition<TContent = unknown> {
  /** the type of attachment to register  */
  id: string;
  /** Inline attachment type - the content is embedded  */
  type: 'reference';
  /** validation function, used to validate the input when attachment is added to a conversation */
  validate: (input: unknown) => MaybePromise<AttachmentParseResult<TContent>>;
  /** resolve the attachment to a value that can be used by the LLM */
  // resolve: (input: unknown) => MaybePromise<unknown>;
  /** format the attachment to presented to the LLM */
  format: (input: unknown) => MaybePromise<AttachmentRepresentation>;
  /**
   * Check if the attachment is different from the previous one
   */
  getDelta: (a: unknown, b: unknown) => MaybePromise<unknown>;
}

// TODO: inline vs reference attachment

export type AttachmentTypeDefinition<TContent = unknown> =
  | InlineAttachmentTypeDefinition<TContent>
  | ReferenceAttachmentTypeDefinition<TContent>;
