/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';

/** A block of GitHub-flavored markdown in an Isomer composition. */
export interface IsomerMarkdownNode extends PrimitiveNode {
  type: 'markdown';
  text: string;
}

/** What an attachment type's `toIsomerComposition` returns, shown in place of the attachment. */
export type AttachmentIsomerComposition = Composition<IsomerMarkdownNode>;

export interface AttachmentIsomerCompositionContext {
  attachment: VersionedAttachment;
  version: number;
}

/** Maps the data of one attachment version to the composition shown in its place. */
export type AttachmentIsomerCompositionMapping<TContent = unknown> = (
  data: TContent,
  context: AttachmentIsomerCompositionContext
) => AttachmentIsomerComposition;
