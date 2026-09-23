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

// Cases tools and skills use availability gating to exclude themselves from
// es-solution spaces. We use them here as a concrete example of the framework
// behavior — the test validates that the availability filtering works at the
// API layer, not Cases-specific logic.
const GATED_TOOL_IDS = [
  platformCoreTools.cases,
  platformCoreCasesTools.manage,
  platformCoreCasesTools.attachments,
  platformCoreCasesTools.getAttachments,
  platformCoreCasesTools.manageAttachments,
  platformCoreCasesTools.observables,
];

const GATED_SKILL_ID = 'cases-management';

apiTest.describe(
  'Agent Builder — availability gating across space solutions',
  { tag: [...tags.stateful.classic] },
  () => {
    const ES_SPACE = 'avail-gate-es';
    const SECURITY_SPACE = 'avail-gate-security';

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

    apiTest(
      'availability-gated tools are excluded from spaces where they are unavailable',
      async ({ asAdmin }) => {
        const response = await asAdmin.get(spaceUrl(`${API_AGENT_BUILDER}/tools`, ES_SPACE), {
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const toolIds = (response.body as ListToolsResponse).results.map((t) => t.id);
        for (const gatedId of GATED_TOOL_IDS) {
          expect(toolIds).not.toContain(gatedId);
        }
      }
    );

    apiTest(
      'availability-gated tools are present in spaces where they are available',
      async ({ asAdmin }) => {
        const response = await asAdmin.get(spaceUrl(`${API_AGENT_BUILDER}/tools`, SECURITY_SPACE), {
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const toolIds = (response.body as ListToolsResponse).results.map((t) => t.id);
        for (const gatedId of GATED_TOOL_IDS) {
          expect(toolIds).toContain(gatedId);
        }
      }
    );

    apiTest(
      'availability-gated skills are excluded from spaces where they are unavailable',
      async ({ asAdmin }) => {
        const response = await asAdmin.get(spaceUrl(`${API_AGENT_BUILDER}/skills`, ES_SPACE), {
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const skillIds = (response.body as ListSkillsResponse).results.map((s) => s.id);
        expect(skillIds).not.toContain(GATED_SKILL_ID);
      }
    );

    apiTest(
      'availability-gated skills are present in spaces where they are available',
      async ({ asAdmin }) => {
        const response = await asAdmin.get(
          spaceUrl(`${API_AGENT_BUILDER}/skills`, SECURITY_SPACE),
          { responseType: 'json' }
        );
        expect(response).toHaveStatusCode(200);
        const skillIds = (response.body as ListSkillsResponse).results.map((s) => s.id);
        expect(skillIds).toContain(GATED_SKILL_ID);
      }
    );
  }
);
