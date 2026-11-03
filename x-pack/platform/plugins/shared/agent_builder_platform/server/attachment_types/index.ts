/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { AgentBuilderPluginSetup, AgentsStart } from '@kbn/agent-builder-server';
import type { ActionsTasksStart } from '@kbn/actions-plugin/server/tasks';
import type { Logger } from '@kbn/logging';
import type { FilesStart } from '@kbn/files-plugin/server';
import { createTextAttachmentType } from './text';
import { createEsqlAttachmentType } from './esql';
import { createScreenContextAttachmentType } from './screen_context';
import { createGraphAttachmentType } from './graph';
import { createConnectorAttachmentType } from './connector';
import { createConnectorSetupAttachmentType } from './connector_setup';
import { createSkillAttachmentType } from './skill';
import { createImageAttachmentType } from './image';

export const registerAttachmentTypes = ({
  agentBuilder,
  getFilesPlugin,
  getAgentsStart,
  getActionsStart,
  logger,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getFilesPlugin: () => Promise<FilesStart>;
  getAgentsStart: () => Promise<AgentsStart>;
  getActionsStart: () => Promise<ActionsTasksStart>;
  logger: Logger;
}) => {
  const attachmentTypes: AttachmentTypeDefinition<any, any>[] = [
    createTextAttachmentType(),
    createScreenContextAttachmentType(),
    createEsqlAttachmentType(),
    createGraphAttachmentType(),
    createConnectorAttachmentType(),
    createConnectorSetupAttachmentType({
      getAgentsStart,
      getActionsStart,
      logger: logger.get('connector-setup'),
    }),
    createSkillAttachmentType(),
    createImageAttachmentType({ getFilesPlugin }),
  ];

  attachmentTypes.forEach((attachmentType) => {
    agentBuilder.attachments.registerType(attachmentType);
  });
};
