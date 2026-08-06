/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import type { ToolAvailabilityConfig } from '@kbn/agent-builder-server';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';

export const osqueryTool = (toolName: string): string =>
  `${internalNamespaces.osquery}.${toolName}`;

export const agentBuilderToolsAvailability = (
  osqueryContext: OsqueryAppContext
): ToolAvailabilityConfig => ({
  cacheMode: 'space',
  handler: async () => ({
    status: osqueryContext.experimentalFeatures.agentBuilderTools ? 'available' : 'unavailable',
    reason: osqueryContext.experimentalFeatures.agentBuilderTools
      ? undefined
      : 'Osquery Agent Builder tools are not enabled',
  }),
});
