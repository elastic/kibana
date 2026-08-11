/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { EmbeddableChatAccess } from '@kbn/agent-builder-browser';
import { deniedEmbeddableChatAccess, type AgentBuilderAccessChecker } from './access';

export const createPublicEmbeddableChatAccess = ({
  accessChecker,
  application,
}: {
  accessChecker: AgentBuilderAccessChecker;
  application: ApplicationStart;
}): (() => Promise<EmbeddableChatAccess>) => {
  return () => {
    if (application.capabilities.agentBuilder?.show !== true) {
      return Promise.resolve(deniedEmbeddableChatAccess());
    }

    return accessChecker.getAgentBuilderAccess();
  };
};
