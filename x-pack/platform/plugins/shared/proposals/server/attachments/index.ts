/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ProposalAttachmentTypeDeps } from './proposal_attachment_type';
import { createProposalAttachmentType } from './proposal_attachment_type';

export const registerProposalAttachment = (
  agentBuilder: AgentBuilderPluginSetup,
  deps: ProposalAttachmentTypeDeps
): void => {
  agentBuilder.attachments.registerType(
    // The registry is typed for the erased `AttachmentTypeDefinition`, so a
    // definition narrowed to its own data shape needs the cast every other
    // attachment-owning plugin also makes here.
    createProposalAttachmentType(deps) as Parameters<
      typeof agentBuilder.attachments.registerType
    >[0]
  );
};
