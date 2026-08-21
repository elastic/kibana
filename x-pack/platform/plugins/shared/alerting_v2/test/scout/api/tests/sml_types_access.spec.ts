/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { apiTest, tags } from '@kbn/scout';
import type { ApiClientFixture, KbnClient, KibanaRole, RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { ACTION_POLICY_SML_TYPE, RULE_SML_TYPE } from '@kbn/alerting-v2-schemas';
import type { ActionPolicyResponse, CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_ACTION_POLICY_API_PATH,
  ALERTING_V2_ENABLED_SETTING_ID,
  ALERTING_V2_RULE_API_PATH,
} from '@kbn/alerting-v2-constants';
import {
  ALERTING_V2_FEATURES,
  ALERTING_V2_UI_CAPABILITIES,
} from '../../../../common/feature_privileges';
import { COMMON_HEADERS } from '../fixtures/constants';

const TOOLS_EXECUTE_API = '/api/agent_builder/tools/_execute';
const GLOBAL_SETTINGS_API = '/api/kibana/global_settings';
const SML_CRAWLER_TASK_TYPE = 'agent_builder_sml:sml_crawler';
const CRAWL_POLL_TIMEOUT_MS = 45_000;
const CRAWL_POLL_INTERVAL_MS = 1_000;

const EXECUTE_HEADERS = {
  ...COMMON_HEADERS,
  'elastic-api-version': '2023-10-31',
};

/**
 * Least privilege that Agent Builder chat itself uses, plus alerting v2 reads.
 *
 * Chat looks up SML records by executing `platform.core.sml_search`, whose
 * public `_execute` route is gated on `agentBuilder:read` — not the
 * `agentBuilderSml` feature. Each alerting v2 SML type then stamps
 * `api:read_alerting-v2-*` on indexed entries, so a caller still needs the
 * matching alerting v2 read privilege to see those hits.
 */
const LIMITED_ALERTING_V2_CHAT_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [],
  },
  kibana: [
    {
      base: [],
      feature: {
        [AGENTBUILDER_FEATURE_ID]: ['read'],
        [ALERTING_V2_FEATURES.rules.id]: [ALERTING_V2_UI_CAPABILITIES.rules.read],
        [ALERTING_V2_FEATURES.actionPolicies.id]: [ALERTING_V2_UI_CAPABILITIES.actionPolicies.read],
      },
      spaces: ['*'],
    },
  ],
};

interface SmlSearchHit {
  entry_id: string;
  type: string;
  title: string;
  attachment_id: string;
}

interface SmlSearchExecuteBody {
  results: Array<{ data?: { items?: SmlSearchHit[] } }>;
}

interface RunSoonResponse {
  id: string;
  error?: string;
}

const getSearchHits = (body: SmlSearchExecuteBody): SmlSearchHit[] =>
  body.results[0]?.data?.items ?? [];

const smlCrawlerTaskId = (typeId: string): string => `${SML_CRAWLER_TASK_TYPE}:${typeId}`;

const runSmlCrawlerSoon = async (kbnClient: KbnClient, typeId: string): Promise<void> => {
  const taskId = smlCrawlerTaskId(typeId);
  const response = await kbnClient.request<RunSoonResponse>({
    method: 'POST',
    path: `/internal/ftr/task_manager/${encodeURIComponent(taskId)}/run_soon`,
    headers: COMMON_HEADERS,
  });

  if (response.data.error && !/already running/i.test(response.data.error)) {
    throw new Error(`Failed to run_soon task '${taskId}': ${response.data.error}`);
  }
};

/*
 * Agent Builder chat discovers alerting v2 rules/policies via the builtin
 * `platform.core.sml_search` tool. `POST /api/agent_builder/tools/_execute`
 * runs that same handler without a conversation, LLM, or connector.
 *
 * Lives under `test/scout/` so `agentBuilder:experimentalFeatures` and
 * `alerting:v2:enabled` can be flipped at runtime. The crawler skips when
 * experimental features are off, and `list()`/`getSmlEntry()` no-op when
 * alerting v2 is disabled. `runSoon` triggers the 1m crawler immediately
 * after the objects exist.
 */
apiTest.describe(
  'Agent Builder — alerting V2 SML type access',
  { tag: tags.stateful.classic },
  () => {
    const searchRunId = randomUUID();
    const searchToken = `alertingv2sml${searchRunId.replaceAll('-', '')}`;
    const ruleTitle = `${searchToken} cpu threshold rule`;
    const policyTitle = `${searchToken} slack action policy`;

    let limitedCredentials: RoleApiCredentials;
    let ruleId: string;
    let policyId: string;
    let ruleAttachmentId: string;
    let policyAttachmentId: string;

    const executeSmlSearch = async (
      apiClient: ApiClientFixture,
      toolParams: { query: string; size?: number; types?: string[] }
    ) => {
      const response = await apiClient.post(TOOLS_EXECUTE_API, {
        headers: { ...EXECUTE_HEADERS, ...limitedCredentials.apiKeyHeader },
        body: {
          tool_id: platformCoreTools.smlSearch,
          tool_params: { size: 20, ...toolParams },
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return response.body as SmlSearchExecuteBody;
    };

    apiTest.beforeAll(async ({ requestAuth, kbnClient, apiClient }) => {
      await kbnClient.uiSettings.update({
        [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
      });

      const { apiKeyHeader: adminApiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      await apiClient.post(`${GLOBAL_SETTINGS_API}/${ALERTING_V2_ENABLED_SETTING_ID}`, {
        headers: { ...COMMON_HEADERS, ...adminApiKeyHeader },
        body: { value: true },
        responseType: 'json',
      });

      const createRuleData: CreateRuleData = {
        kind: 'alert',
        metadata: { name: ruleTitle },
        schedule: { every: '1m', lookback: '1m' },
        recovery_strategy: 'no_breach',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 10' },
        },
        time_field: '@timestamp',
        grouping: { fields: ['host.name'] },
        state_transition: { pending_count: 0, recovering_count: 0 },
      };

      const createdRule = await kbnClient.request<RuleResponse>({
        method: 'POST',
        path: ALERTING_V2_RULE_API_PATH,
        headers: COMMON_HEADERS,
        body: createRuleData,
      });
      ruleId = createdRule.data.id;
      ruleAttachmentId = `${RULE_SML_TYPE}://${ruleId}`;

      const createdPolicy = await kbnClient.request<ActionPolicyResponse>({
        method: 'POST',
        path: ALERTING_V2_ACTION_POLICY_API_PATH,
        headers: COMMON_HEADERS,
        body: {
          name: policyTitle,
          description: 'Scout SML type access action policy',
          destinations: [{ type: 'workflow', id: 'scout-sml-workflow-id' }],
        },
      });
      policyId = createdPolicy.data.id;
      policyAttachmentId = `${ACTION_POLICY_SML_TYPE}://${policyId}`;

      await Promise.all([
        runSmlCrawlerSoon(kbnClient, RULE_SML_TYPE),
        runSmlCrawlerSoon(kbnClient, ACTION_POLICY_SML_TYPE),
      ]);

      limitedCredentials = await requestAuth.getApiKeyForCustomRole(LIMITED_ALERTING_V2_CHAT_ROLE);

      await expect
        .poll(
          async () => {
            const hits = getSearchHits(await executeSmlSearch(apiClient, { query: searchToken }));
            const attachmentIds = hits.map((hit) => hit.attachment_id);
            return (
              attachmentIds.includes(ruleAttachmentId) && attachmentIds.includes(policyAttachmentId)
            );
          },
          { timeout: CRAWL_POLL_TIMEOUT_MS, intervals: [CRAWL_POLL_INTERVAL_MS] }
        )
        .toBe(true);
    });

    apiTest.afterAll(async ({ apiClient, kbnClient, requestAuth }) => {
      if (ruleId) {
        await kbnClient.request({
          method: 'DELETE',
          path: `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(ruleId)}`,
          headers: COMMON_HEADERS,
          ignoreErrors: [404],
          retries: 0,
        });
      }
      if (policyId) {
        await kbnClient.request({
          method: 'DELETE',
          path: `${ALERTING_V2_ACTION_POLICY_API_PATH}/${encodeURIComponent(policyId)}`,
          headers: COMMON_HEADERS,
          ignoreErrors: [404],
          retries: 0,
        });
      }

      await kbnClient.uiSettings.unset(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      await apiClient.delete(
        `${GLOBAL_SETTINGS_API}/${encodeURIComponent(ALERTING_V2_ENABLED_SETTING_ID)}`,
        { headers: { ...COMMON_HEADERS, ...apiKeyHeader }, responseType: 'json' }
      );
    });

    apiTest(
      'limited privilege user can search alerting v2 rule and action policy SML types',
      async ({ apiClient }) => {
        const hits = getSearchHits(await executeSmlSearch(apiClient, { query: searchToken }));

        expect(hits.find((hit) => hit.attachment_id === ruleAttachmentId)).toMatchObject({
          type: RULE_SML_TYPE,
          title: ruleTitle,
        });
        expect(hits.find((hit) => hit.attachment_id === policyAttachmentId)).toMatchObject({
          type: ACTION_POLICY_SML_TYPE,
          title: policyTitle,
        });
      }
    );

    apiTest(
      'limited privilege user can filter SML search to the rule type',
      async ({ apiClient }) => {
        const hits = getSearchHits(
          await executeSmlSearch(apiClient, {
            query: searchToken,
            types: [RULE_SML_TYPE],
          })
        );
        const attachmentIds = hits.map((hit) => hit.attachment_id);
        expect(attachmentIds).toContain(ruleAttachmentId);
        expect(attachmentIds).not.toContain(policyAttachmentId);
      }
    );

    apiTest(
      'limited privilege user can filter SML search to the action policy type',
      async ({ apiClient }) => {
        const hits = getSearchHits(
          await executeSmlSearch(apiClient, {
            query: searchToken,
            types: [ACTION_POLICY_SML_TYPE],
          })
        );
        const attachmentIds = hits.map((hit) => hit.attachment_id);
        expect(attachmentIds).toContain(policyAttachmentId);
        expect(attachmentIds).not.toContain(ruleAttachmentId);
      }
    );
  }
);
