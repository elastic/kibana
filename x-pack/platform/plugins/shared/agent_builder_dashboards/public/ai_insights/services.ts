/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { IdGenerator } from '../attachment_types';

export interface AiInsightsServices {
  core: CoreStart;
  openChat?: AgentBuilderPluginStart['openChat'];
  draftAttachmentId?: IdGenerator;
  canShowAgentBuilder: boolean;
}

let services: AiInsightsServices | undefined;

export function setAiInsightsServices(next: AiInsightsServices): void {
  services = next;
}

export function getAiInsightsServices(): AiInsightsServices {
  if (!services) {
    throw new Error('AI insights services have not been set');
  }
  return services;
}
