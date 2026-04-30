/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolverTypeDefinition } from '@kbn/agent-context-layer-plugin/server';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import { createTextAttachmentType } from './text';
import { createEsqlAttachmentType } from './esql';
import { createScreenContextAttachmentType } from './screen_context';
import { createVisualizationAttachmentType } from './visualization';
import { createGraphAttachmentType } from './graph';
import { createConnectorAttachmentType } from './connector';
import type {
  AgentBuilderPlatformPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies,
} from '../types';

export const registerAttachmentTypes = ({
  coreSetup,
  setupDeps,
}: {
  coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>;
  setupDeps: PluginSetupDependencies;
}) => {
  const { agentContextLayer } = setupDeps;

  const attachmentTypes: ResolverTypeDefinition<any, any>[] = [
    createTextAttachmentType(),
    createScreenContextAttachmentType(),
    createEsqlAttachmentType(),
    createVisualizationAttachmentType(),
    createGraphAttachmentType(),
    createConnectorAttachmentType(),
  ];

  attachmentTypes.forEach((attachmentType) => {
    agentContextLayer.registerResolverType(attachmentType);
  });
};
