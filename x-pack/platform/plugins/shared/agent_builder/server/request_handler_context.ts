/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, CustomRequestHandlerContext, CoreSetup } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import { getCurrentSpaceId } from './utils/spaces';
import type { AgentBuilderPluginStart, AgentBuilderStartDependencies } from './types';

export interface AgentBuilderRequestHandlerContext {
  spaces: {
    getSpaceId: () => string;
  };
}

export type AgentBuilderHandlerContext = CustomRequestHandlerContext<{
  licensing: LicensingApiRequestHandlerContext;
  agentBuilder: AgentBuilderRequestHandlerContext;
}>;

export type AgentBuilderRouter = IRouter<AgentBuilderHandlerContext>;

export const registerAgentBuilderHandlerContext = ({
  coreSetup,
}: {
  coreSetup: CoreSetup<AgentBuilderStartDependencies, AgentBuilderPluginStart>;
}) => {
  coreSetup.http.registerRouteHandlerContext<AgentBuilderHandlerContext, 'agentBuilder'>(
    'agentBuilder',
    async (context, request) => {
      const [, { spaces }] = await coreSetup.getStartServices();

      return {
        spaces: {
          getSpaceId: () => getCurrentSpaceId({ request, spaces }),
        },
      };
    }
  );
};
