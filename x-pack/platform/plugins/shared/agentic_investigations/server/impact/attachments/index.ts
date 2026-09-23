/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { impactAttachmentType } from './impact_attachment_type';

/** Registers the readonly investigation_impact type with Agent Builder. */
export const registerImpactAttachment = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.attachments.registerType(
    // The registry is typed for the erased `AttachmentTypeDefinition`, so a
    // definition narrowed to its own data shape needs the cast every other
    // attachment-owning plugin also makes here.
    impactAttachmentType as Parameters<typeof agentBuilder.attachments.registerType>[0]
  );
};
