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
}

// will support other sub types later
export type AttachmentTypeDefinition<TContent = unknown> = InlineAttachmentTypeDefinition<TContent>;
