/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { agentBuilderPack, specDispatcher } from './spec/pack';
export type { MarkdownNode, Spec, SpecNode } from './spec/pack';
export { replyToSpec, stripAttachmentTags } from './spec/reply_to_spec';
export { addSlackProjection } from './slack/add_slack_projection';
export type { AddSlackProjectionOptions } from './slack/add_slack_projection';
