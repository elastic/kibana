/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { HttpSetup } from '@kbn/core-http-browser';
import { createProposalAttachmentDefinition } from './proposal_attachment_definition';
import { PROPOSAL_ATTACHMENT_TYPE } from '../../../common';

export const registerProposalAttachmentTypes = (
  agentBuilder: AgentBuilderPluginStart,
  http: HttpSetup
): void => {
  agentBuilder.attachments.addAttachmentType(
    PROPOSAL_ATTACHMENT_TYPE,
    createProposalAttachmentDefinition({ http })
  );
};
