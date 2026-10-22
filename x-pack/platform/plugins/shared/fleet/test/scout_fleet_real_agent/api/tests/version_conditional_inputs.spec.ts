/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { apiTest } from '../fixtures';
import type { EnrolledAgent } from '../fixtures';
import { uploadTestPackage } from '../fixtures/test_package';
import type { UploadedTestPackage } from '../fixtures/test_package';

const API_VERSION_HEADER = { 'elastic-api-version': '2023-10-31' };
const POLL_TIMEOUT_MS = 3 * 60 * 1000;
const POLL_INTERVALS_MS = [2000, 3000, 5000];
const TEST_TIMEOUT_MS = 10 * 60 * 1000;

const AGENT_MIN_MINOR = { major: 9, minor: 3 };

interface FleetAgentDoc {
  policy_id: string;
  policy_base_id?: string;
  agent_policy_id?: string;
  policy_revision_idx?: number;
  components?: Array<{ id: string; type: string; status?: string }>;
}

interface PolicyInput {
  name?: string;
  type?: string;
  streams?: Array<{ id?: string; program?: string }>;
}

interface FleetPolicyDoc {
  policy_id: string;
  revision_idx: number;
  data: { id: string; inputs: PolicyInput[] };
}

interface ConditionCase {
  title: string;
  packagePolicy: {
    name: string;
    packageName: string;
    packageVersion: string;
    policyTemplate: string;
    inputType: string;
    /** The variables of the input, the ones of the package that are required without default. */
    inputVars?: Record<string, unknown>;
    /** The enabled streams: an input without one is not run by the agent. */
    streams: unknown[];
  };
  /** Whether the inputs are compiled for an agent from 9.3 on, which the agent version condition lets through. */
  isCompiledForConditionMet: (inputs: PolicyInput[]) => boolean;
  /** Whether the inputs are compiled for an agent of an older minor version. */
  isCompiledForConditionNotMet: (inputs: PolicyInput[]) => boolean;
}

const CASES: ConditionCase[] = [
  {
    // `agent.version: ^9.3.0` in the manifest of the package: the input of the package is only in the
    // policy of the agents from 9.3 on
    title: 'a package with an agent version condition',
    packagePolicy: {
      name: 'abnormal_security-1',
      packageName: 'abnormal_security',
      packageVersion: '1.12.0',
      policyTemplate: 'abnormal_security',
      inputType: 'cel',
      inputVars: {
        url: { value: 'https://api.abnormalplatform.com', type: 'text' },
        access_token: { value: 'token', type: 'password' },
      },
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'scout_abnormal_security.audit' },
          vars: {
            initial_interval: { value: '24h', type: 'text' },
            interval: { value: '5m', type: 'text' },
            page_size: { value: 100, type: 'text' },
            http_client_timeout: { value: '30s', type: 'text' },
            tags: { value: ['forwarded', 'abnormal_security-audit'], type: 'text' },
          },
        },
      ],
    },
    isCompiledForConditionMet: (inputs) =>
      inputs.some(({ name }) => name === 'abnormal_security-1'),
    isCompiledForConditionNotMet: (inputs) => inputs.length === 0,
  },
  {
    // `{{#semverSatisfies _meta.agent.version "^9.3.0"}}` in the stream template: the input is in the
    // policy of every agent, and its stream only has the `program` from 9.3 on
    title: 'a package with an agent version condition in an input template',
    packagePolicy: {
      name: 'auth0-1',
      packageName: 'auth0',
      packageVersion: '1.26.0',
      policyTemplate: 'auth0_events',
      inputType: 'cel',
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'scout_auth0.logs' },
          vars: {
            url: { value: 'https://tenant.us.auth0.com', type: 'text' },
            client_id: { type: 'text', value: 'id' },
            client_secret: { type: 'password', value: 'secret' },
            initial_interval: { value: '24h', type: 'text' },
            interval: { value: '5m', type: 'text' },
            batch_size: { value: 100, type: 'integer' },
            http_client_timeout: { value: '30s', type: 'text' },
            tags: { value: ['forwarded', 'auth0-logstream'], type: 'text' },
            preserve_original_event: { value: false, type: 'bool' },
          },
        },
      ],
    },
    isCompiledForConditionMet: (inputs) =>
      inputs.some(({ name, streams }) => name === 'auth0-1' && streams?.[0]?.program !== undefined),
    isCompiledForConditionNotMet: (inputs) =>
      inputs.some(({ name, streams }) => name === 'auth0-1' && streams?.[0]?.program === undefined),
  },
];

const isOlderThanMinAgentVersion = (policyId: string) => {
  const [major, minor] = policyId.split('#')[1].split('.').map(Number);
  return (
    major < AGENT_MIN_MINOR.major ||
    (major === AGENT_MIN_MINOR.major && minor < AGENT_MIN_MINOR.minor)
  );
};

for (const testCase of CASES) {
  const { packagePolicy } = testCase;

  apiTest.describe(
    `Version conditional inputs with a real Elastic Agent: ${testCase.title}`,
    { tag: ['@local-stateful-classic'] },
    () => {
      let agentPolicyId: string;
      let agent: EnrolledAgent;
      let uploadedPackage: UploadedTestPackage;

      const getAgentDoc = async (esClient: EsClient) =>
        (await esClient.get<FleetAgentDoc>({ index: '.fleet-agents', id: agent.agentId }))._source!;

      /**
       * Waits until the agent is on the policy of its minor version, and returns its id. The agent
       * version is the stack version: from 9.3 on, so the agent is moved to `<id>#<major>.<minor>`
       * and not to `#sentinel`, which the sentinel version only uses for policies without conditions.
       */
      const waitForAgentVariantPolicyId = async (esClient: EsClient) => {
        await expect
          .poll(async () => (await getAgentDoc(esClient)).policy_id, {
            timeout: POLL_TIMEOUT_MS,
            intervals: POLL_INTERVALS_MS,
            message: 'the agent should be moved to the policy of its minor version',
          })
          .toMatch(new RegExp(`^${agentPolicyId}#\\d+\\.\\d+$`));
        return (await getAgentDoc(esClient)).policy_id;
      };

      /** Latest `.fleet-policies` doc of every version specific policy of the agent policy. */
      const getVariantPolicyDocs = async (esClient: EsClient) => {
        const response = await esClient.search<FleetPolicyDoc>({
          index: '.fleet-policies',
          size: 100,
          query: { term: { policy_base_id: agentPolicyId } },
          sort: [{ revision_idx: 'desc' }],
        });
        const latest = new Map<string, FleetPolicyDoc>();
        for (const hit of response.hits.hits) {
          const doc = hit._source!;
          if (doc.policy_id.includes('#') && !latest.has(doc.policy_id)) {
            latest.set(doc.policy_id, doc);
          }
        }
        return latest;
      };

      apiTest.beforeAll(async ({ kbnClient, realFleet }) => {
        // the default hook timeout is shorter than the time an agent can take to come online
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        // the packages of the registry have no agent version conditions: upload the test package
        uploadedPackage = await uploadTestPackage(
          kbnClient as any,
          packagePolicy.packageName,
          packagePolicy.packageVersion
        );
        const { data: policy } = await kbnClient.request<{ item: { id: string } }>({
          method: 'POST',
          path: '/api/fleet/agent_policies',
          headers: API_VERSION_HEADER,
          body: {
            name: `scout-version-inputs-${Date.now()}`,
            namespace: 'default',
            monitoring_enabled: [],
          },
        });
        agentPolicyId = policy.item.id;

        // the agent version condition turns on `has_agent_version_conditions` of the agent policy
        await kbnClient.request({
          method: 'POST',
          path: '/api/fleet/package_policies',
          headers: API_VERSION_HEADER,
          body: {
            name: packagePolicy.name,
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            inputs: [
              {
                policy_template: packagePolicy.policyTemplate,
                type: packagePolicy.inputType,
                enabled: true,
                vars: packagePolicy.inputVars,
                streams: packagePolicy.streams,
              },
            ],
            package: { name: uploadedPackage.name, version: uploadedPackage.version },
          },
        });

        // the input cannot collect from a real service: the agent can be degraded
        agent = await realFleet.enrollAgent(agentPolicyId, { allowUnhealthy: true });
      });

      apiTest.afterAll(async ({ kbnClient }) => {
        await agent?.stop().catch(() => undefined);
        await kbnClient
          .request({
            method: 'POST',
            path: '/api/fleet/agents/bulk_unenroll',
            headers: API_VERSION_HEADER,
            body: { agents: `policy_base_id:"${agentPolicyId}"`, force: true, revoke: true },
          })
          .catch(() => undefined);
        await kbnClient
          .request({
            method: 'POST',
            path: '/api/fleet/agent_policies/delete',
            headers: API_VERSION_HEADER,
            body: { agentPolicyId, force: true },
          })
          .catch(() => undefined);
        await uploadedPackage?.uninstall().catch(() => undefined);
      });

      apiTest(
        'moves the agent to the policy of its minor version, compiled for its version',
        async ({ esClient }) => {
          apiTest.setTimeout(TEST_TIMEOUT_MS);

          const agentVariantPolicyId = await waitForAgentVariantPolicyId(esClient);
          expect(isOlderThanMinAgentVersion(agentVariantPolicyId)).toBe(false);
          expect((await getAgentDoc(esClient)).policy_base_id).toBe(agentPolicyId);

          const variants = await getVariantPolicyDocs(esClient);
          const agentVariant = variants.get(agentVariantPolicyId)!;
          expect(agentVariant).toBeDefined();
          expect(agentVariant.data.id).toBe(agentVariantPolicyId);
          expect(testCase.isCompiledForConditionMet(agentVariant.data.inputs)).toBe(true);

          // the policies of the older minor versions are compiled without what the condition lets through
          const olderVariants = [...variants.values()].filter(({ policy_id: policyId }) =>
            isOlderThanMinAgentVersion(policyId)
          );
          expect(olderVariants.length).toBeGreaterThan(0);
          for (const variant of olderVariants) {
            expect(testCase.isCompiledForConditionNotMet(variant.data.inputs)).toBe(true);
          }
        }
      );

      apiTest(
        'the agent applies the compiled policy and runs the input of the package',
        async ({ esClient }) => {
          apiTest.setTimeout(TEST_TIMEOUT_MS);
          // does not depend on the previous test: the policy of the agent is looked up here
          const agentVariantPolicyId = await waitForAgentVariantPolicyId(esClient);
          const agentVariant = (await getVariantPolicyDocs(esClient)).get(agentVariantPolicyId)!;
          expect(agentVariant).toBeDefined();

          // the agent checks in with the policy it runs, and acknowledges its revision
          await expect
            .poll(
              async () => {
                const { agent_policy_id: runningPolicyId, policy_revision_idx: revision } =
                  await getAgentDoc(esClient);
                return [runningPolicyId, revision];
              },
              {
                timeout: POLL_TIMEOUT_MS,
                intervals: POLL_INTERVALS_MS,
                message: 'the agent should acknowledge the compiled policy',
              }
            )
            .toStrictEqual([agentVariantPolicyId, agentVariant.revision_idx]);

          // the agent runs a component for the input it applied
          await expect
            .poll(
              async () =>
                ((await getAgentDoc(esClient)).components ?? []).some(
                  ({ type }) => type === packagePolicy.inputType
                ),
              {
                timeout: POLL_TIMEOUT_MS,
                intervals: POLL_INTERVALS_MS,
                message: `the agent should run a ${packagePolicy.inputType} component`,
              }
            )
            .toBe(true);
        }
      );
    }
  );
}
