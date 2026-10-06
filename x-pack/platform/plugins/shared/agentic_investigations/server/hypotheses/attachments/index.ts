/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ImpactPrivilegesChecker } from '../../impact/services/check_impact_privileges';
import type { HypothesesService } from '../services/hypotheses_service';
import { hypothesesAttachment } from './hypotheses_attachment_type';

/** Registers the readonly investigation_hypotheses type with Agent Builder. */
export const registerHypothesesAttachment = (
  agentBuilder: AgentBuilderPluginSetup,
  {
    getHypothesesService,
    privileges,
    logger,
  }: {
    getHypothesesService: () => HypothesesService;
    privileges: ImpactPrivilegesChecker;
    logger: Logger;
  }
): void => {
  hypothesesAttachment.registerAttachmentType(agentBuilder, {
    getService: () => getHypothesesService().getDocumentService(),
    assertCanRead: (request) => privileges.assertCanRead(request),
    logger,
  });
};

export { formatHypothesesForAgent, hypothesesAttachment } from './hypotheses_attachment_type';
