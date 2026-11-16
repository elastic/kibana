/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import type { ApiClientFixture, KibanaRole, ScoutLogger } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { ListProposalsResponse, ProposalWithMetadata } from '@kbn/proposals-common';
import { isHitlWaitStepType, TerminalExecutionStatuses } from '@kbn/workflows';
import type { ExecutionStatus } from '@kbn/workflows';
import {
  apiTest,
  COMMON_HEADERS,
  PUBLIC_HEADERS,
  createIdentity,
  deleteProposalsByConversation,
  getProposal,
} from '../fixtures';
import type { TestIdentity } from '../fixtures';

const CREATE_RULE_ACTION_WORKFLOW_ID = 'system-alertzero-action-create-rule';
/** Each of the test's polls waits this long at most. */
const POLL_TIMEOUT_MS = 90 * 1000;
const POLL_COUNT = 6;
/** How long each of the two action-identity lookups waits for the execution chain to be recorded. */
const ACTION_CHAIN_TIMEOUT_MS = 30 * 1000;
const ACTION_CHAIN_COUNT = 2;
/** Longer than every poll together, so a stuck step fails with the poll's message, not a timeout. */
const TEST_TIMEOUT_MS =
  POLL_COUNT * POLL_TIMEOUT_MS + ACTION_CHAIN_COUNT * ACTION_CHAIN_TIMEOUT_MS + 60 * 1000;
const POLL_INTERVALS_MS = [500, 1_000, 2_000, 5_000];

const CANCEL_SETTLE_TIMEOUT_MS = 30 * 1000;

/** A privilege refusal reaches the proposal as a 403, whatever the message around it says. */
const REFUSED_ERROR = /403|forbidden|unauthori[sz]ed/i;

/** The same role for both approvers, except for what they may do to detection rules. */
const approverRole = (rules: 'read' | 'all'): KibanaRole => ({
  elasticsearch: { cluster: ['monitor_inference'], indices: [] },
  kibana: [
    {
      base: [],
      feature: {
        alertzero: ['all'],
        proposals: ['all'],
        agentBuilder: ['all'],
        workflowsManagement: ['all'],
        actions: ['read'],
        securitySolutionRulesV4: [rules],
      },
      spaces: ['*'],
    },
  ],
});

apiTest.describe(
  'POST /internal/proposals/{id}/approve — a failed action is retried as the next approver',
  // The routes only exist when this suite's local config enables agentic investigations.
  { tag: ['@local-stateful-classic'] },
  () => {
    let gateOwner: TestIdentity | undefined;
    let rulesReader: TestIdentity | undefined;
    let rulesWriter: TestIdentity | undefined;
    let adminCookieHeader: Record<string, string>;
    let conversationId: string | undefined;
    let gateExecutionId: string | undefined;
    let ruleName: string;
    let actionInput: Record<string, unknown>;

    const requireIdentities = (): {
      owner: TestIdentity;
      reader: TestIdentity;
      writer: TestIdentity;
    } => {
      if (!gateOwner || !rulesReader || !rulesWriter) {
        throw new Error('Setup: the identities were not created');
      }
      return { owner: gateOwner, reader: rulesReader, writer: rulesWriter };
    };

    // `leg` indexes `resolve_as_approver` by `stepExecutionIndex`. Only the execution chain is
    // awaited, never the uid: retrying until it matched would hide the race this checks for.
    const expectActionRanAs = async (
      apiClient: ApiClientFixture,
      leg: number,
      expected: TestIdentity,
      who: { owner: TestIdentity; reader: TestIdentity; writer: TestIdentity },
      log: ScoutLogger
    ): Promise<void> => {
      interface ExecutionDoc {
        executedBy?: string;
        stepExecutions: Array<{
          stepId: string;
          stepExecutionIndex: number;
          state?: { executionId?: string };
        }>;
      }
      type Lookup = { found: ExecutionDoc } | { missing: string };

      const getExecution = async (id: string, label: string): Promise<Lookup> => {
        const response = await apiClient.get(`api/workflows/executions/${id}`, {
          headers: { ...PUBLIC_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        });
        return response.statusCode === 200
          ? { found: response.body as ExecutionDoc }
          : { missing: `${label} execution ${id} (status ${response.statusCode})` };
      };
      const childOf = (
        execution: ExecutionDoc,
        stepId: string,
        index: number,
        label: string
      ): { childId: string } | { missing: string } => {
        const childId = execution.stepExecutions
          .filter((step) => step.stepId === stepId)
          .sort((a, b) => a.stepExecutionIndex - b.stepExecutionIndex)[index]?.state?.executionId;
        return childId
          ? { childId }
          : { missing: `the ${label}: no ${stepId} #${index} with a child execution` };
      };

      let action: ExecutionDoc | undefined;
      const resolveChain = async (): Promise<string> => {
        const gate = await getExecution(gateExecutionId as string, 'gate');
        if ('missing' in gate) return `missing ${gate.missing}`;
        const resolveLink = childOf(gate.found, 'resolve_as_approver', leg, 'gate');
        if ('missing' in resolveLink) return `missing ${resolveLink.missing}`;
        const resolve = await getExecution(resolveLink.childId, 'resolve');
        if ('missing' in resolve) return `missing ${resolve.missing}`;
        const actionLink = childOf(resolve.found, 'execute_as_approver', 0, 'resolve execution');
        if ('missing' in actionLink) return `missing ${actionLink.missing}`;
        const found = await getExecution(actionLink.childId, 'create-rule action');
        if ('missing' in found) return `missing ${found.missing}`;
        if (!found.found.executedBy) return 'missing executedBy on the create-rule action';
        action = found.found;
        return 'resolved';
      };
      await expect
        .poll(resolveChain, { timeout: ACTION_CHAIN_TIMEOUT_MS, intervals: POLL_INTERVALS_MS })
        .toBe('resolved');

      expect(
        action?.executedBy,
        `create-rule action #${leg + 1} ran as ${action?.executedBy}; ` +
          `expected ${expected.username} (${expected.profileUid}). ` +
          `gate owner ${who.owner.profileUid}, reader ${who.reader.profileUid}, ` +
          `writer ${who.writer.profileUid}`
      ).toBe(expected.profileUid);
      log.info(
        `create-rule action #${leg + 1} ran as ${action?.executedBy} ` +
          `(gate owner ${who.owner.profileUid}, reader ${who.reader.profileUid}, ` +
          `writer ${who.writer.profileUid})`
      );
    };

    /** The proposal is indexed before the gate parks (and re-parks after a failure); approving earlier gets a 409. */
    const isGateWaiting = async (apiClient: ApiClientFixture): Promise<boolean> => {
      const response = await apiClient.get(`api/workflows/executions/${gateExecutionId}`, {
        headers: { ...PUBLIC_HEADERS, ...adminCookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const { status, stepExecutions } = response.body as {
        status: string;
        stepExecutions: Array<{
          stepType?: string;
          status: string;
          finishedAt?: string;
          hitl?: { respondedAt?: string };
        }>;
      };
      return (
        status === 'waiting_for_input' &&
        stepExecutions.some(
          (step) =>
            isHitlWaitStepType(step.stepType) &&
            step.status === 'waiting_for_input' &&
            !step.finishedAt &&
            !step.hitl?.respondedAt
        )
      );
    };

    const listChain = async (
      apiClient: ApiClientFixture,
      caller: TestIdentity
    ): Promise<ProposalWithMetadata[]> => {
      const response = await apiClient.get(
        `internal/proposals?conversationId=${conversationId}&size=100`,
        { headers: { ...COMMON_HEADERS, ...caller.cookieHeader }, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      return (response.body as ListProposalsResponse).proposals;
    };

    const fetchRules = (apiClient: ApiClientFixture) =>
      apiClient.get(
        `api/detection_engine/rules/_find?per_page=100&filter=${encodeURIComponent(
          `alert.attributes.name: "${ruleName}"`
        )}`,
        { headers: { ...PUBLIC_HEADERS, ...adminCookieHeader }, responseType: 'json' }
      );

    const findRuleIds = async (apiClient: ApiClientFixture): Promise<string[]> => {
      const response = await fetchRules(apiClient);
      expect(response).toHaveStatusCode(200);
      return (response.body.data as Array<{ id: string }>).map(({ id }) => id);
    };

    /** Teardown must reach every step, so a failure is logged and the next step still runs. */
    const attempt = async (log: ScoutLogger, description: string, run: () => Promise<unknown>) => {
      try {
        await run();
      } catch (error) {
        log.warning(`Cleanup: failed to ${description}: ${String(error)}`);
      }
    };

    apiTest.beforeAll(async ({ apiClient, esClient, kbnClient, samlAuth, log }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));

      // Starts the gate, so a run as the gate's owner cannot pass for a run as an approver.
      gateOwner = await createIdentity({
        esClient,
        kbnClient,
        apiClient,
        log,
        role: approverRole('all'),
        prefix: 'scout_gate_owner',
      });
      rulesReader = await createIdentity({
        esClient,
        kbnClient,
        apiClient,
        log,
        role: approverRole('read'),
        prefix: 'scout_approver_read',
      });
      rulesWriter = await createIdentity({
        esClient,
        kbnClient,
        apiClient,
        log,
        role: approverRole('all'),
        prefix: 'scout_approver_all',
      });

      const conversation = await apiClient.post('api/agent_builder/conversations', {
        headers: { ...PUBLIC_HEADERS, ...rulesReader.cookieHeader },
        body: {
          title: 'Scout proposal retry identity',
          template_id: 'investigation',
          access_control: { access_mode: 'public' },
          metadata: { status: 'open' },
        },
        responseType: 'json',
      });
      if (conversation.statusCode !== 200 || !conversation.body.id) {
        throw new Error(`Setup: conversation create failed (${conversation.statusCode})`);
      }
      conversationId = conversation.body.id;

      ruleName = `scout retry identity ${randomUUID().slice(0, 8)}`;
      actionInput = {
        type: 'esql',
        language: 'esql',
        name: ruleName,
        description: 'Created by the proposal retry identity Scout suite.',
        query:
          'FROM logs-* | WHERE http.response.status_code == 502 | STATS c = COUNT(*) | WHERE c > 50',
        severity: 'medium',
        risk_score: 47,
        interval: '5m',
        from: 'now-6m',
      };
    });

    apiTest.afterAll(async ({ apiClient, esClient, log }) => {
      // The gate stays parked on the approval when the test stops early, and a parked gate can
      // still index a fresh clone after the proposals are gone, so it is cancelled first.
      if (gateExecutionId) {
        await attempt(log, `cancel the gate execution ${gateExecutionId}`, async () => {
          const response = await apiClient.post(
            `api/workflows/executions/${gateExecutionId}/cancel`,
            { headers: { ...PUBLIC_HEADERS, ...adminCookieHeader }, responseType: 'json' }
          );
          if (response.statusCode !== 200) {
            throw new Error(`status ${response.statusCode}`);
          }
        });
        // A cancel is only requested; the gate can still index a clone until it has stopped.
        await attempt(log, `wait for the gate execution ${gateExecutionId} to stop`, async () => {
          await expect
            .poll(
              async () => {
                const response = await apiClient.get(
                  `api/workflows/executions/${gateExecutionId}`,
                  {
                    headers: { ...PUBLIC_HEADERS, ...adminCookieHeader },
                    responseType: 'json',
                  }
                );
                return TerminalExecutionStatuses.includes(response.body?.status as ExecutionStatus);
              },
              { timeout: CANCEL_SETTLE_TIMEOUT_MS, intervals: [500, 1_000, 2_000] }
            )
            .toBe(true);
        });
      }

      if (ruleName) {
        await attempt(log, `delete the rules named "${ruleName}"`, async () => {
          const found = await fetchRules(apiClient);
          if (found.statusCode !== 200) {
            throw new Error(`rule lookup returned ${found.statusCode}`);
          }
          const ids = (found.body.data as Array<{ id: string }>).map(({ id }) => id);
          await Promise.all(
            ids.map((id) =>
              apiClient.delete(`api/detection_engine/rules?id=${id}`, {
                headers: { ...PUBLIC_HEADERS, ...adminCookieHeader },
              })
            )
          );
        });
      }

      if (conversationId) {
        const id = conversationId;
        await attempt(log, `delete the proposals of conversation ${id}`, () =>
          deleteProposalsByConversation(esClient, [id])
        );
        if (rulesReader) {
          const { cookieHeader } = rulesReader;
          await attempt(log, `delete the conversation ${id}`, () =>
            apiClient.delete(`api/agent_builder/conversations/${id}`, {
              headers: { ...PUBLIC_HEADERS, ...cookieHeader },
            })
          );
        }
      }

      await Promise.all([gateOwner?.cleanup(), rulesReader?.cleanup(), rulesWriter?.cleanup()]);
    });

    apiTest(
      'refuses a Rules-read approver, then the retry runs as the next approver and creates the rule as them',
      async ({ apiClient, log }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const identities = requireIdentities();
        const { owner, reader, writer } = identities;

        const run = await apiClient.post('api/workflows/workflow/system-create-proposal/run', {
          headers: { ...PUBLIC_HEADERS, ...owner.cookieHeader },
          body: {
            inputs: {
              conversationId,
              title: 'Scout retry identity proposal',
              comment: 'Detect a spike of 502s.',
              origin: 'agent_builder',
              confidence: 'high',
              category: 'configure',
              actionWorkflowId: CREATE_RULE_ACTION_WORKFLOW_ID,
              actionInput,
            },
          },
          responseType: 'json',
        });
        expect(run).toHaveStatusCode(200);
        gateExecutionId = run.body.workflowExecutionId;

        // The gate indexes the proposal and parks on the approval; it is not synchronous.
        await expect
          .poll(
            async () => {
              const [first] = await listChain(apiClient, reader);
              return first?.status === 'pending' && Boolean(first.workflowExecutionId);
            },
            { timeout: POLL_TIMEOUT_MS, intervals: POLL_INTERVALS_MS }
          )
          .toBe(true);
        await expect
          .poll(() => isGateWaiting(apiClient), {
            timeout: POLL_TIMEOUT_MS,
            intervals: POLL_INTERVALS_MS,
          })
          .toBe(true);
        const [original] = await listChain(apiClient, reader);

        // The reader holds Proposed Actions, so the route lets them through; the rules
        // privilege is enforced when the action runs with their credentials.
        const firstApproval = await apiClient.post(`internal/proposals/${original.id}/approve`, {
          headers: { ...COMMON_HEADERS, ...reader.cookieHeader },
          body: { actionInput },
          responseType: 'json',
        });
        expect(firstApproval, JSON.stringify(firstApproval.body)).toHaveStatusCode(200);

        await expect
          .poll(
            async () => {
              const { body } = await getProposal(apiClient, reader.cookieHeader, original.id);
              return `${body.decision}/${body.status}/${body.supersededBy ? 'cloned' : ''}`;
            },
            { timeout: POLL_TIMEOUT_MS, intervals: POLL_INTERVALS_MS }
          )
          .toBe('approved/failed/cloned');
        const failed = (await getProposal(apiClient, reader.cookieHeader, original.id))
          .body as ProposalWithMetadata;
        expect(failed.decidedBy?.username).toBe(reader.username);
        expect(failed.executionError).toMatch(REFUSED_ERROR);
        // The one wording-specific check: the refusal is about the privilege the reader lacks.
        expect(failed.executionError).toContain('rules-all');
        expect(await findRuleIds(apiClient)).toHaveLength(0);
        await expectActionRanAs(apiClient, 0, reader, identities, log);

        const cloneId = failed.supersededBy as string;
        const clone = (await getProposal(apiClient, reader.cookieHeader, cloneId))
          .body as ProposalWithMetadata;
        expect(clone.status).toBe('pending');
        expect(clone.decision).toBeUndefined();
        // A retry is not a revision: same chain position, and no `supersedes` link.
        expect(clone.supersedes).toBeUndefined();
        expect(clone.revision).toBe(original.revision);
        expect(clone.rootProposalId).toBe(original.rootProposalId);
        expect(clone.workflowExecutionId).toBe(original.workflowExecutionId);
        // The deadline is inherited rather than restarted. Guard against both being unset.
        expect(typeof original.expiresAt).toBe('string');
        expect(clone.expiresAt).toBe(original.expiresAt);
        expect(clone.previousExecutionError).toMatch(REFUSED_ERROR);

        // The gate re-parks on a fresh step after the failure; the clone can be decided only then.
        await expect
          .poll(() => isGateWaiting(apiClient), {
            timeout: POLL_TIMEOUT_MS,
            intervals: POLL_INTERVALS_MS,
          })
          .toBe(true);

        const retry = await apiClient.post(`internal/proposals/${cloneId}/approve`, {
          headers: { ...COMMON_HEADERS, ...writer.cookieHeader },
          body: { actionInput },
          responseType: 'json',
        });
        expect(retry, JSON.stringify(retry.body)).toHaveStatusCode(200);

        // Wait for either terminal outcome, so a failed retry reaches the identity check below.
        // It can fail intermittently on main while the immediate-resume task is still claimed at
        // approval time: Task Manager skips API key replacement for a claimed task (#301886).
        await expect
          .poll(
            async () => {
              const { body } = await getProposal(apiClient, writer.cookieHeader, cloneId);
              // The error rides along so a timeout still says why the retry failed.
              return `${body.decision}/${body.status}${
                body.status === 'failed' ? ` (${body.executionError})` : ''
              }`;
            },
            { timeout: POLL_TIMEOUT_MS, intervals: POLL_INTERVALS_MS }
          )
          .toMatch(/^approved\/(succeeded|failed)\b/);
        // Runs before the outcome check: on failure, whose credentials the action took is the finding.
        await expectActionRanAs(apiClient, 1, writer, identities, log);

        const retried = (await getProposal(apiClient, writer.cookieHeader, cloneId))
          .body as ProposalWithMetadata;
        expect(
          retried.status,
          `retry ended ${retried.decision}/${retried.status}: ${retried.executionError}`
        ).toBe('succeeded');
        expect(retried.decidedBy?.username).toBe(writer.username);

        const ruleIds = await findRuleIds(apiClient);
        expect(ruleIds).toHaveLength(1);
        const rule = await apiClient.get(`api/detection_engine/rules?id=${ruleIds[0]}`, {
          headers: { ...PUBLIC_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        });
        expect(rule).toHaveStatusCode(200);
        expect(rule.body.created_by).toBe(writer.username);

        // The decision that created the rule also ends the gate. Waiting for that keeps the
        // teardown's cancel for a test that aborts, instead of racing a gate still resolving.
        await expect
          .poll(
            async () => {
              const response = await apiClient.get(`api/workflows/executions/${gateExecutionId}`, {
                headers: { ...PUBLIC_HEADERS, ...adminCookieHeader },
                responseType: 'json',
              });
              return response.body?.status;
            },
            { timeout: POLL_TIMEOUT_MS, intervals: POLL_INTERVALS_MS }
          )
          .toBe('completed');
      }
    );
  }
);
