/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, platformCoreCasesTools } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { ListToolsResponse } from '../../../../common/http_api/tools';
import type { ListSkillsResponse } from '../../../../common/http_api/skills';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';
import { spaceUrl } from '../fixtures/space_paths';

const CASES_TOOL_IDS = [
  platformCoreTools.cases,
  platformCoreCasesTools.manage,
  platformCoreCasesTools.attachments,
  platformCoreCasesTools.getAttachments,
  platformCoreCasesTools.manageAttachments,
  platformCoreCasesTools.observables,
];

const CASES_SKILL_IDS = ['cases-management'];

apiTest.describe(
  'Agent Builder — Cases availability gating',
  { tag: [...tags.stateful.classic] },
  () => {
    const ES_SPACE = 'cases-avail-es';
    const SECURITY_SPACE = 'cases-avail-security';

    apiTest.beforeAll(async ({ kbnClient }) => {
      for (const [spaceId, solution] of [
        [ES_SPACE, 'es'],
        [SECURITY_SPACE, 'security'],
      ] as const) {
        await kbnClient.request({
          method: 'POST',
          path: '/api/spaces/space',
          body: { id: spaceId, name: spaceId, disabledFeatures: [], solution },
        });
      }
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      for (const spaceId of [ES_SPACE, SECURITY_SPACE]) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/spaces/space/${encodeURIComponent(spaceId)}`,
        });
      }
    });

    apiTest('Cases tools are NOT listed in an es-solution space', async ({ asAdmin }) => {
      const response = await asAdmin.get(spaceUrl(`${API_AGENT_BUILDER}/tools`, ES_SPACE), {
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const toolIds = (response.body as ListToolsResponse).results.map((t) => t.id);
      for (const casesToolId of CASES_TOOL_IDS) {
        expect(toolIds).not.toContain(casesToolId);
      }
    });

    apiTest('Cases tools ARE listed in a security-solution space', async ({ asAdmin }) => {
      const response = await asAdmin.get(spaceUrl(`${API_AGENT_BUILDER}/tools`, SECURITY_SPACE), {
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const toolIds = (response.body as ListToolsResponse).results.map((t) => t.id);
      for (const casesToolId of CASES_TOOL_IDS) {
        expect(toolIds).toContain(casesToolId);
      }
    });

    apiTest('Cases skills are NOT listed in an es-solution space', async ({ asAdmin }) => {
      const response = await asAdmin.get(
        spaceUrl(`${API_AGENT_BUILDER}/skills?include_plugins=true`, ES_SPACE),
        { responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      const skillIds = (response.body as ListSkillsResponse).results.map((s) => s.id);
      for (const casesSkillId of CASES_SKILL_IDS) {
        expect(skillIds).not.toContain(casesSkillId);
      }
    });

    apiTest('Cases skills ARE listed in a security-solution space', async ({ asAdmin }) => {
      const response = await asAdmin.get(
        spaceUrl(`${API_AGENT_BUILDER}/skills?include_plugins=true`, SECURITY_SPACE),
        { responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      const skillIds = (response.body as ListSkillsResponse).results.map((s) => s.id);
      for (const casesSkillId of CASES_SKILL_IDS) {
        expect(skillIds).toContain(casesSkillId);
      }
    });
  }
);
