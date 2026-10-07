/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { agentBuilderPack, specDispatcher } from './spec/pack';
export type { AttachmentNode, AttachmentSpec, MarkdownNode, Spec, SpecNode } from './spec/pack';
export { replyToSpec } from './spec/reply_to_spec';
export { resolveSpec } from './spec/resolve_spec';
export type {
  AttachmentSpecContext,
  AttachmentSpecMapping,
  ResolveSpecOptions,
} from './spec/resolve_spec';
export { addIsomerProjections } from './projections/add_isomer_projections';
export type { AddProjection, ProjectionContext } from './projections/types';
