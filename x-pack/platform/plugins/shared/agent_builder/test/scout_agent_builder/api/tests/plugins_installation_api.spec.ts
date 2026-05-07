/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { PluginsTestServer } from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/plugins_server/plugins_server';
import { apiTest } from '../fixtures';
import {
  API_AGENT_BUILDER,
  ELASTIC_API_VERSION,
  SCOUT_AGENT_BUILDER_GITHUB_MOCK_PORT,
} from '../fixtures/constants';

const ASSETS_DIR = path.join(
  REPO_ROOT,
  'x-pack/platform/test/agent_builder_api_integration/apis/plugins/assets'
);

const PLUGIN_NAME = 'test-plugin';
const SKILL_DIR_NAME = 'test-skill';
const EXPECTED_SKILL_NAME = 'Test Skill';

apiTest.describe(
  'Agent Builder — plugin installation API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let pluginsServer: PluginsTestServer;
    let serverUrl: string;
    let createdPluginIds: string[] = [];

    apiTest.beforeAll(async ({ log }) => {
      pluginsServer = new PluginsTestServer({
        port: SCOUT_AGENT_BUILDER_GITHUB_MOCK_PORT,
        assetsDir: ASSETS_DIR,
        log,
      });
      await pluginsServer.start();
      serverUrl = pluginsServer.getUrl();
    });

    apiTest.afterAll(async ({ asAdmin }) => {
      for (const pluginId of createdPluginIds) {
        await asAdmin.delete(`${API_AGENT_BUILDER}/plugins/${encodeURIComponent(pluginId)}`, {
          headers: {
            'elastic-api-version': ELASTIC_API_VERSION,
          },
        });
      }
      pluginsServer.stop();
    });

    const v = () => ({ 'elastic-api-version': ELASTIC_API_VERSION });

    const expectedSkillId = (pluginName: string = PLUGIN_NAME) => `${pluginName}-${SKILL_DIR_NAME}`;

    apiTest('install from remote zip URL lifecycle', async ({ asAdmin }) => {
      const install = await asAdmin.post(`${API_AGENT_BUILDER}/plugins/install`, {
        headers: v(),
        body: { url: `${serverUrl}/plugins/${PLUGIN_NAME}.zip` },
        responseType: 'json',
      });
      expect(install).toHaveStatusCode(200);
      const pluginId = (install.body as { id: string }).id;
      createdPluginIds.push(pluginId);

      const skills = await asAdmin.get(
        `${API_AGENT_BUILDER}/skills?${new URLSearchParams({ include_plugins: 'true' })}`,
        {
          headers: v(),
          responseType: 'json',
        }
      );
      expect(skills).toHaveStatusCode(200);
      const skill = skills.body.results.find((s: { id: string }) => s.id === expectedSkillId());
      expect(skill?.name).toBe(EXPECTED_SKILL_NAME);
      expect(skill?.readonly).toBe(true);

      await asAdmin.delete(`${API_AGENT_BUILDER}/plugins/${encodeURIComponent(pluginId)}`, {
        headers: v(),
        responseType: 'json',
      });
      createdPluginIds = createdPluginIds.filter((id) => id !== pluginId);
    });
  }
);
