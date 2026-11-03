/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { builtinBrowserToolIds } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_BROWSER_TOOLS_SETTING_ID } from '@kbn/management-settings-ids';
import { BrowserToolRegistry } from './browser_tool_registry';
import { selectBrowserToolIds } from './select_browser_tool_ids';

const createRegistry = (ids: string[]) => {
  const registry = new BrowserToolRegistry();
  ids.forEach((id) =>
    registry.register({ id, description: 'test tool', schema: z.object({}), handler: () => {} })
  );
  return registry;
};

const createUiSettings = (enabled: boolean) => {
  const get = jest.fn((key: string) =>
    key === AGENT_BUILDER_BROWSER_TOOLS_SETTING_ID ? enabled : undefined
  );
  return { uiSettings: { get } as unknown as IUiSettingsClient, get };
};

describe('selectBrowserToolIds', () => {
  const ids = [builtinBrowserToolIds.getPageSnapshot, builtinBrowserToolIds.navigateTo];

  it('returns [] when the setting is off', () => {
    const { uiSettings, get } = createUiSettings(false);
    expect(
      selectBrowserToolIds({ registry: createRegistry(ids), uiSettings, surface: 'embedded' })
    ).toEqual([]);
    expect(get).toHaveBeenCalledWith(AGENT_BUILDER_BROWSER_TOOLS_SETTING_ID);
  });

  it('omits navigate_to for the app surface', () => {
    const { uiSettings } = createUiSettings(true);
    expect(
      selectBrowserToolIds({ registry: createRegistry(ids), uiSettings, surface: 'app' })
    ).toEqual([builtinBrowserToolIds.getPageSnapshot]);
  });

  it('keeps it for embedded', () => {
    const { uiSettings } = createUiSettings(true);
    expect(
      selectBrowserToolIds({ registry: createRegistry(ids), uiSettings, surface: 'embedded' })
    ).toEqual(ids);
  });
});
