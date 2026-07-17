/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Logger } from '@kbn/core/server';
import type { GetScopedClients } from '../../routes/types';
import { createSignificantEventAttachmentType } from './significant_event_attachment_type';
import { createSignificantEventFeatureAttachmentType } from './feature_attachment_type';
import { createSignificantEventDetectionAttachmentType } from './detection_attachment_type';

const registerAttachmentType = (
  agentBuilder: AgentBuilderPluginSetup,
  definition: AttachmentTypeDefinition<string, unknown>
): void => {
  agentBuilder.attachments.registerType(
    definition as Parameters<typeof agentBuilder.attachments.registerType>[0]
  );
};

export const registerAgentBuilderAttachments = ({
  agentBuilder,
  getScopedClients,
  logger,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  logger: Logger;
}): void => {
  registerAttachmentType(
    agentBuilder,
    createSignificantEventAttachmentType({
      logger: logger.get('significant_event_attachment'),
      getScopedClients,
    })
  );

  registerAttachmentType(
    agentBuilder,
    createSignificantEventFeatureAttachmentType({
      logger: logger.get('significant_event_feature_attachment'),
      getScopedClients,
    })
  );

  registerAttachmentType(
    agentBuilder,
    createSignificantEventDetectionAttachmentType({
      logger: logger.get('significant_event_detection_attachment'),
      getScopedClients,
    })
  );
};
