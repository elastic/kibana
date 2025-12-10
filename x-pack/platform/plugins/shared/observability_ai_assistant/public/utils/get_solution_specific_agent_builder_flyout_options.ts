/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { SolutionView } from '@kbn/spaces-plugin/common';

export interface SolutionSpecificAgentBuilderFlyoutOptions {
  sessionTag?: string;
  agentId?: string;
}

/**
 * Returns solution-specific options for opening the Agent Builder flyout.
 *
 * - On serverless, uses project type from cloud.serverless.projectType
 * - On ECH, uses the active space solution
 *
 * When the solution is Observability, this returns an options object with:
 * - sessionTag: 'observability'
 * - agentId: 'observability.agent'
 *
 * Otherwise, returns an empty options object so that the default agent is used.
 */
export const getSolutionSpecificAgentBuilderFlyoutOptions = async ({
  isServerless,
  cloud,
  spaces,
}: {
  isServerless: boolean;
  cloud?: CloudStart;
  spaces?: SpacesPluginStart;
}): Promise<SolutionSpecificAgentBuilderFlyoutOptions> => {
  let currentSolution: SolutionView | undefined;

  if (isServerless) {
    const projectType = cloud?.serverless?.projectType;
    currentSolution = projectType === 'observability' ? 'oblt' : 'es';
  } else if (spaces?.getActiveSpace) {
    try {
      const space = await spaces.getActiveSpace();
      currentSolution = space?.solution;
    } catch {
      // ignore space resolution errors and fall back to default agent
    }
  }

  if (currentSolution === 'oblt') {
    return {
      sessionTag: 'observability',
      agentId: 'observability.agent',
    };
  }

  return {};
};
