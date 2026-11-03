/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { builtinBrowserToolIds } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_BROWSER_TOOLS_SETTING_ID } from '@kbn/management-settings-ids';
import type { BrowserToolRegistry } from './browser_tool_registry';

/**
 * Ids of the registered browser tools a chat surface advertises to the server.
 * The full-page app omits `navigate_to`: navigating away would unmount the conversation.
 */
export const selectBrowserToolIds = ({
  registry,
  uiSettings,
  surface,
}: {
  registry: BrowserToolRegistry;
  uiSettings: IUiSettingsClient;
  surface: 'embedded' | 'app';
}): string[] => {
  if (!uiSettings.get<boolean>(AGENT_BUILDER_BROWSER_TOOLS_SETTING_ID)) {
    return [];
  }
  const ids = registry.list().map(({ id }) => id);
  return surface === 'app' ? ids.filter((id) => id !== builtinBrowserToolIds.navigateTo) : ids;
};
