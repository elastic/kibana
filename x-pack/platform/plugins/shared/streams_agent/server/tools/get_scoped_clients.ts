/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { RouteHandlerScopedClients } from '@kbn/streams-plugin/server';
import type { StreamsAgentCoreSetup } from '../types';

export async function getScopedStreamsClients({
  core,
  request,
}: {
  core: StreamsAgentCoreSetup;
  request: KibanaRequest;
}): Promise<RouteHandlerScopedClients> {
  const [, pluginsStart] = await core.getStartServices();
  return pluginsStart.streams.getScopedClients({ request });
}
