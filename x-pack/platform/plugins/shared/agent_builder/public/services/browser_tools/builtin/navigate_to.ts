/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { AppStatus } from '@kbn/core/public';
import type { BrowserToolDefinition } from '@kbn/agent-builder-browser';
import { builtinBrowserToolIds, navigateToSchema } from '@kbn/agent-builder-common';
import { getBuiltinDescription } from './get_description';
import type { BuiltinToolDeps } from './types';

type NavigateToParams = { app_id: string; path?: string };

export const createNavigateToTool = ({
  application,
}: BuiltinToolDeps): BrowserToolDefinition<NavigateToParams> => ({
  id: builtinBrowserToolIds.navigateTo,
  description: getBuiltinDescription(builtinBrowserToolIds.navigateTo),
  schema: navigateToSchema as BrowserToolDefinition<NavigateToParams>['schema'],
  handler: async ({ app_id: appId, path }, { signal }) => {
    const apps = await firstValueFrom(application.applications$);
    const app = apps.get(appId);
    if (!app || app.status !== AppStatus.accessible) {
      throw new Error(`Unknown or unavailable app "${appId}"`);
    }
    if (signal.aborted) {
      throw new Error('aborted');
    }
    await application.navigateToApp(appId, { path });
    return { content: { url: application.getUrlForApp(appId, { path }) } };
  },
});
