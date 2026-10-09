/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { createHash } from 'crypto';
import { tags } from '@kbn/scout';
import { defaultAgentToolIds } from '@kbn/agent-builder-common';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';
import {
  claimsMutation,
  finalAnswer,
  givesRulePageRoute,
  loadedSkillNames,
  mentionsRule,
  toolCalls,
  verdictsMentioned,
  type CoverageVerdict,
  type ToolCallStep,
} from '../../src/security_rule_checks';
import { COVERAGE_RULE_NAMES, seedDetectionCoverageFixtures } from './detection_coverage_fixtures';

/**
 * Evals for the `detection-coverage` skill. Three kinds live in this file:
 *
 * 1. **Verdict correctness** (deterministic `converse` + `expect`). The skill must return
 *    exactly one of four verdict tokens for a seeded situation, and name the rule that
 *    justifies it. These read the answer text and the `security.find_rules` /
 *    `security.find_prebuilt_rules` tool calls, so a right verdict for the wrong reason
 *    still fails. The same-technique-different-behaviour case traps a verdict based on
 *    ATT&CK metadata alone instead of an exact behavioral match.
 *
 * 2. **Intent routing** (`evaluateDataset`). The skill owns exactly one intent: someone
 *    WANTS coverage to exist. Questions *about* coverage are reporting intents that
 *    belong to `find-security-rules` (inventory) or `recommend-prebuilt-rules`
 *    (deployment advisory), and a request that already carries the rule logic belongs
 *    straight to `detection-rule-edit` with no coverage search at all.
 *
 * 3. **Action discipline** (deterministic). The skill decides and never mutates: it has
 *    no write tools, so an enable/install verdict must end in a link, never in a claim
 *    that something was changed.
 *
 * Suites 1 and 3 run on an agent pinned to three skills, so skill routing cannot fail them.
 * Routing is scored only in suite 2, on the default agent.
 *
 * Requirements for the eval target Kibana:
 * - `dexAiSkillFindRules` and `dexAiSkillRecommendPrebuiltRules`, because this skill
 *   loads both siblings at runtime to run its two searches, and the routing suite
 *   expects those siblings to win the reporting intents.
 * - The bundled `security_detection_engine` package, installed in `beforeAll`, so
 *   `prebuilt_available` has a real catalog to find.
 */

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, traceEsClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

const FIND_RULES_TOOL_ID = 'security.find_rules';
const FIND_PREBUILT_RULES_TOOL_ID = 'security.find_prebuilt_rules';
const CREATE_RULE_TOOL_ID = 'security.create_detection_rule';

const FLEET_BULK_INSTALL_PATH = '/api/fleet/epm/packages/_bulk';
const AGENTS_API_BASE_PATH = '/api/agent_builder/agents';

/** At most `SMALL_SKILL_THRESHOLD` (3) skills, so the skill router is skipped. */
const COVERAGE_SKILL_IDS = [
  'detection-coverage',
  'find-security-rules',
  'recommend-prebuilt-rules',
];

/**
 * Fail with the actual cause when a verdict is missing.
 *
 * Two very different things produce "no verdict": the router never selected this skill
 * (so another skill answered, and no verdict was ever owed), or the skill ran and did not
 * state one. Asserting the skill loaded first turns a confusing empty-array diff into the
 * real diagnosis.
 */
const expectCoverageSkillRan = (steps: ToolCallStep[]) => {
  const loaded = loadedSkillNames(steps);
  expect(
    loaded.some((skill) => skill.includes('detection-coverage')),
    `routing miss: the agent never loaded detection-coverage (loaded: ${
      loaded.join(', ') || 'none'
    })`
  ).toBe(true);
};

const expectSingleVerdict = (answer: string, expected: CoverageVerdict) => {
  expect(
    verdictsMentioned(answer),
    `expected exactly one verdict token (${expected}) in the answer`
  ).toEqual([expected]);
};

const answerOf = finalAnswer;

evaluate.describe(
  'Security Skills - Detection Coverage verdicts',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    let teardown: (() => Promise<void>) | undefined;
    let coverageAgentId: string | undefined;

    evaluate.beforeAll(async ({ kbnClient, fetch, connector, log }) => {
      log.info('[detection-coverage eval] installing bundled security_detection_engine package');
      await kbnClient.request({
        path: FLEET_BULK_INSTALL_PATH,
        method: 'POST',
        query: { prerelease: true },
        headers: { 'elastic-api-version': '2023-10-31' },
        body: { packages: ['security_detection_engine'], force: false },
      });
      const seeded = await seedDetectionCoverageFixtures({ kbnClient, log });
      teardown = seeded.cleanup;

      // Agent ids are capped at 64 chars; one agent per model project.
      const connectorHash = createHash('sha256').update(connector.id).digest('hex').slice(0, 8);
      const agentId = `eval_det_cov_${connectorHash}_${Date.now().toString(36)}`;
      await fetch(AGENTS_API_BASE_PATH, {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          id: agentId,
          name: 'Eval: detection coverage',
          description: 'Evaluation agent pinned to the detection-coverage skill family.',
          configuration: {
            // Default agent's static tools, plus the create tool so "never called" is a real check.
            tools: [{ tool_ids: [...defaultAgentToolIds, CREATE_RULE_TOOL_ID] }],
            skill_ids: COVERAGE_SKILL_IDS,
          },
        }),
      });
      coverageAgentId = agentId;
      log.info(`[detection-coverage eval] created pinned eval agent ${agentId}`);
    });

    evaluate.afterAll(async ({ fetch, log }) => {
      await teardown?.();
      if (!coverageAgentId) return;
      try {
        await fetch(`${AGENTS_API_BASE_PATH}/${encodeURIComponent(coverageAgentId)}`, {
          method: 'DELETE',
          version: '2023-10-31',
        });
      } catch (error) {
        log.warning(
          `[detection-coverage eval] failed to delete eval agent ${coverageAgentId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });

    evaluate(
      'an enabled exact match returns covered_enabled and names that rule',
      async ({ chatClient }) => {
        const response = await chatClient.converse({
          options: { agentId: coverageAgentId },
          messages: [
            {
              message: 'I need detection for PowerShell encoded commands on Windows endpoints.',
            },
          ],
        });

        expectCoverageSkillRan((response.steps ?? []) as ToolCallStep[]);
        expectSingleVerdict(answerOf(response), 'covered_enabled');
        expect(mentionsRule(answerOf(response), COVERAGE_RULE_NAMES.powershell)).toBe(true);
        // Installed rules must be searched before any verdict about existing coverage.
        expect(
          toolCalls((response.steps ?? []) as ToolCallStep[], FIND_RULES_TOOL_ID).length
        ).toBeGreaterThan(0);
      }
    );

    evaluate(
      'a disabled exact match returns covered_disabled and points at the rule page',
      async ({ chatClient }) => {
        const response = await chatClient.converse({
          options: { agentId: coverageAgentId },
          messages: [
            {
              message: 'We need to detect lateral movement over SMB between Windows hosts.',
            },
          ],
        });

        expectCoverageSkillRan((response.steps ?? []) as ToolCallStep[]);
        expectSingleVerdict(answerOf(response), 'covered_disabled');
        expect(mentionsRule(answerOf(response), COVERAGE_RULE_NAMES.smb)).toBe(true);
        // The cheapest route is enabling what already exists, so the answer must not
        // propose authoring a rule, and must not pretend it enabled anything itself.
        expect(
          toolCalls((response.steps ?? []) as ToolCallStep[], CREATE_RULE_TOOL_ID)
        ).toHaveLength(0);
        expect(claimsMutation(answerOf(response)), 'the skill cannot enable a rule').toBe(false);
      }
    );

    evaluate('sharing a MITRE technique is not coverage on its own', async ({ chatClient }) => {
      // Trap: two enabled fixtures carry T1059, but neither detects a Linux Python
      // reverse shell. A technique-level match here would hide a real gap.
      const response = await chatClient.converse({
        options: { agentId: coverageAgentId },
        messages: [
          {
            message: 'I need detection for Python reverse shells on Linux servers.',
          },
        ],
      });

      expectCoverageSkillRan((response.steps ?? []) as ToolCallStep[]);
      const verdicts = verdictsMentioned(answerOf(response));
      expect(verdicts).toHaveLength(1);
      // Naming a close rule is expected, so only the verdict is asserted.
      expect(
        ['no_coverage', 'prebuilt_available'],
        'a Linux Python reverse shell is not covered by the Windows T1059 fixtures'
      ).toContain(verdicts[0]);
    });

    evaluate(
      'a rule that is close but too narrow is not coverage and is named',
      async ({ chatClient }) => {
        const response = await chatClient.converse({
          options: { agentId: coverageAgentId },
          messages: [
            {
              message: 'We need detection for kubectl exec into pods in production namespaces.',
            },
          ],
        });

        expectCoverageSkillRan((response.steps ?? []) as ToolCallStep[]);
        // Elastic ships an all-namespace kubectl exec rule, so `prebuilt_available` is valid too.
        const verdicts = verdictsMentioned(answerOf(response));
        expect(verdicts).toHaveLength(1);
        expect(
          ['no_coverage', 'prebuilt_available'],
          'a staging-only rule does not cover production namespaces'
        ).toContain(verdicts[0]);
        expect(mentionsRule(answerOf(response), COVERAGE_RULE_NAMES.kubectlStaging)).toBe(true);
      }
    );

    evaluate(
      'an uninstalled prebuilt rule returns prebuilt_available and is checked against installed rules first',
      async ({ chatClient }) => {
        const response = await chatClient.converse({
          options: { agentId: coverageAgentId },
          messages: [
            {
              message:
                'We have no detection for brute force attempts against Okta user accounts. What should I do?',
            },
          ],
        });

        expectCoverageSkillRan((response.steps ?? []) as ToolCallStep[]);
        expectSingleVerdict(answerOf(response), 'prebuilt_available');
        const steps = (response.steps ?? []) as ToolCallStep[];
        // Installed rules first: recommending an install for a rule already owned is the
        // exact duplicate this skill exists to prevent.
        expect(toolCalls(steps, FIND_RULES_TOOL_ID).length).toBeGreaterThan(0);
        expect(toolCalls(steps, FIND_PREBUILT_RULES_TOOL_ID).length).toBeGreaterThan(0);
        expect(claimsMutation(answerOf(response)), 'the skill cannot install a rule').toBe(false);
      }
    );

    evaluate(
      'a same-technique sibling resolves to its own rule, not the other T1059 rule',
      async ({ chatClient }) => {
        // Near miss: Office-spawns-cmd and encoded PowerShell are both enabled and both T1059.
        // Picking the PowerShell rule here means the verdict rode on the technique, not the behaviour.
        const response = await chatClient.converse({
          messages: [
            {
              message:
                'Do we detect Word or Excel spawning cmd.exe on Windows endpoints? I want that covered.',
            },
          ],
        });

        expectCoverageSkillRan((response.steps ?? []) as ToolCallStep[]);
        expectSingleVerdict(answerOf(response), 'covered_enabled');
        expect(mentionsRule(answerOf(response), COVERAGE_RULE_NAMES.officeCmd)).toBe(true);
        expect(
          mentionsRule(answerOf(response), COVERAGE_RULE_NAMES.powershell),
          'the PowerShell rule shares T1059 but does not detect this behaviour'
        ).toBe(false);
      }
    );

    evaluate(
      'a request inside a narrow rule scope is covered, where the same ask outside it is not',
      async ({ chatClient }) => {
        // Pair for the production kubectl case: the staging scope IS covered, so a skill that
        // answers no_coverage for every kubectl ask would pass that case and fail this one.
        const response = await chatClient.converse({
          messages: [
            {
              message: 'Is kubectl exec into pods in the staging namespace already detected?',
            },
          ],
        });

        expectCoverageSkillRan((response.steps ?? []) as ToolCallStep[]);
        expectSingleVerdict(answerOf(response), 'covered_enabled');
        expect(mentionsRule(answerOf(response), COVERAGE_RULE_NAMES.kubectlStaging)).toBe(true);
      }
    );

    evaluate(
      'a different lateral-movement protocol is not covered by the disabled SMB rule',
      async ({ chatClient }) => {
        // Near miss: the disabled SMB rule is a lateral-movement rule, but RDP is a different
        // protocol and behaviour. covered_disabled would tell the analyst to enable a rule that
        // cannot detect what they asked about.
        const response = await chatClient.converse({
          messages: [
            {
              message: 'We need detection for lateral movement over RDP between Windows hosts.',
            },
          ],
        });

        expectCoverageSkillRan((response.steps ?? []) as ToolCallStep[]);
        const verdicts = verdictsMentioned(answerOf(response));
        expect(verdicts).toHaveLength(1);
        expect(
          ['no_coverage', 'prebuilt_available'],
          'an SMB rule is not RDP coverage, enabled or not'
        ).toContain(verdicts[0]);
        expect(
          toolCalls((response.steps ?? []) as ToolCallStep[], CREATE_RULE_TOOL_ID)
        ).toHaveLength(0);
      }
    );

    evaluate('decides without mutating: no write tool is ever called', async ({ chatClient }) => {
      const response = await chatClient.converse({
        options: { agentId: coverageAgentId },
        messages: [
          {
            message: 'We need to detect lateral movement over SMB. Just enable whatever covers it.',
          },
        ],
      });

      const steps = (response.steps ?? []) as ToolCallStep[];
      expect(toolCalls(steps, CREATE_RULE_TOOL_ID)).toHaveLength(0);
      // The route still has to be actionable for the user, with a link to the rule page.
      expect(
        givesRulePageRoute(steps, answerOf(response)),
        'an enable route must link a specific rule page'
      ).toBe(true);
      expect(claimsMutation(answerOf(response)), 'the skill cannot enable a rule').toBe(false);
    });
  }
);

/**
 * The workflow message of `coverage_review.yaml` (step `coverage_check`), with a gap that
 * only the installable catalog covers. Elastic ships several encoded-PowerShell rules for
 * T1059.001, and no installed rule may match, so the only correct verdict is
 * `prebuilt_available`. The evidence names no length threshold on purpose: the closest
 * prebuilt rule fires at 4,000 characters, so "over 1,000 characters" makes it too narrow.
 *
 * Two failures this traps, both seen in workflow runs:
 * - the model stops after empty installed-rule searches and never searches the catalog;
 * - the model searches the catalog once by parent technique (hundreds of rules), judges
 *   the first page, and returns `no_coverage`.
 */
const PREBUILT_ONLY_GAP_MESSAGE = `Use the [/detection-coverage](skill://detection-coverage) skill to decide
whether this detection gap is already covered. The supplied context is
sufficient; do not ask a follow-up question and do not draft a rule.

ATT&CK technique: T1059.001
Detection gap: Long Base64-encoded PowerShell commands are not detected.
Evidence: Hunt found powershell.exe started with long Base64-encoded command lines on 3 hosts. The decoded scripts downloaded a second-stage payload. No detection alert fired.

Report one verdict. Take every rule name and id from a tool result.`;

/** Names of every rule that `security.find_prebuilt_rules` returned in these calls. */
const prebuiltRuleNames = (calls: ToolCallStep[]): string[] =>
  calls.flatMap((call) => {
    const results: unknown = call.results;
    const parsed = (typeof results === 'string' ? JSON.parse(results) : results ?? []) as unknown[];
    return parsed.flatMap((result) => {
      const rules = (result as { data?: { rules?: Array<{ name?: unknown }> } })?.data?.rules;
      return (rules ?? []).map((rule) => rule.name).filter((name): name is string => !!name);
    });
  });

/** An installed rule with one of these words could be a real match and change the verdict. */
const PREBUILT_ONLY_GAP_CONFLICT = /powershell|base64|encoded/i;

evaluate.describe(
  'Security Skills - Detection Coverage prebuilt-only gap',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    let coverageAgentId: string | undefined;

    evaluate.beforeAll(async ({ kbnClient, fetch, connector }) => {
      await kbnClient.request({
        path: FLEET_BULK_INSTALL_PATH,
        method: 'POST',
        query: { prerelease: true },
        headers: { 'elastic-api-version': '2023-10-31' },
        body: { packages: ['security_detection_engine'], force: false },
      });

      const connectorHash = createHash('sha256').update(connector.id).digest('hex').slice(0, 8);
      const agentId = `eval_det_cov_pb_${connectorHash}_${Date.now().toString(36)}`;
      await fetch(AGENTS_API_BASE_PATH, {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          id: agentId,
          name: 'Eval: detection coverage (prebuilt-only gap)',
          description: 'Evaluation agent pinned to the detection-coverage skill family.',
          configuration: {
            tools: [{ tool_ids: [...defaultAgentToolIds, CREATE_RULE_TOOL_ID] }],
            skill_ids: COVERAGE_SKILL_IDS,
          },
        }),
      });
      coverageAgentId = agentId;
    });

    evaluate.afterAll(async ({ fetch, log }) => {
      if (!coverageAgentId) return;
      try {
        await fetch(`${AGENTS_API_BASE_PATH}/${encodeURIComponent(coverageAgentId)}`, {
          method: 'DELETE',
          version: '2023-10-31',
        });
      } catch (error) {
        log.warning(
          `[detection-coverage eval] failed to delete eval agent ${coverageAgentId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });

    evaluate(
      'a gap covered only by the installable catalog returns prebuilt_available on every run',
      async ({ chatClient, kbnClient, repetitions, log }) => {
        // Fixtures of other specs (e.g. find_rules) install PowerShell rules in the same
        // space. With one of them present, `covered_enabled` can be correct, so stop here.
        const { data: installed } = await kbnClient.request<{ data: Array<{ name: string }> }>({
          path: '/api/detection_engine/rules/_find?per_page=10000',
          method: 'GET',
          headers: { 'elastic-api-version': '2023-10-31' },
        });
        const conflicting = (installed?.data ?? [])
          .map((rule) => rule.name)
          .filter((name) => PREBUILT_ONLY_GAP_CONFLICT.test(name));
        expect(
          conflicting,
          'precondition: no installed rule may cover this gap; run this case alone'
        ).toEqual([]);

        const failures: string[] = [];
        for (let run = 1; run <= repetitions; run++) {
          const response = await chatClient.converse({
            options: { agentId: coverageAgentId },
            messages: [{ message: PREBUILT_ONLY_GAP_MESSAGE }],
          });
          const steps = (response.steps ?? []) as ToolCallStep[];
          const answer = answerOf(response);
          const verdicts = verdictsMentioned(answer);
          const prebuiltCalls = toolCalls(steps, FIND_PREBUILT_RULES_TOOL_ID);
          // A verdict for a rule the tool never returned is an invented rule, not a pass.
          const grounded = prebuiltRuleNames(prebuiltCalls).some((name) =>
            mentionsRule(answer, name)
          );
          const passed =
            prebuiltCalls.length > 0 && verdicts.join() === 'prebuilt_available' && grounded;
          const summary =
            `verdicts=${verdicts.join('|') || 'none'} ` +
            `find_prebuilt_rules calls=${prebuiltCalls.length} grounded=${grounded}`;

          log.info(
            `[detection-coverage eval] prebuilt-only run ${run}/${repetitions}: ${
              passed ? 'PASS' : 'FAIL'
            } ${summary}`
          );
          if (!passed) {
            failures.push(`run ${run}: ${summary}`);
          }
        }

        expect(
          failures,
          `${repetitions - failures.length} of ${repetitions} runs returned prebuilt_available`
        ).toEqual([]);
      }
    );
  }
);

evaluate.describe(
  'Security Skills - Detection Coverage routing',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    let teardown: (() => Promise<void>) | undefined;

    evaluate.beforeAll(async ({ kbnClient, log }) => {
      await kbnClient.request({
        path: FLEET_BULK_INSTALL_PATH,
        method: 'POST',
        query: { prerelease: true },
        headers: { 'elastic-api-version': '2023-10-31' },
        body: { packages: ['security_detection_engine'], force: false },
      });
      const seeded = await seedDetectionCoverageFixtures({ kbnClient, log });
      teardown = seeded.cleanup;
    });

    evaluate.afterAll(async () => {
      await teardown?.();
    });

    evaluate(
      'wanting coverage to exist activates detection-coverage',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-detection-coverage-routing',
            description:
              'Validates that a request to MAKE a behaviour covered — with no rule logic ' +
              'supplied — activates the detection-coverage skill, which checks installed ' +
              'rules and the installable catalog before anyone authors a new rule.',
            examples: [
              {
                input: {
                  question: 'I need detection for credential dumping from LSASS on Windows.',
                },
                output: {
                  expected:
                    'I will check whether an installed rule (enabled or disabled) or an installable prebuilt rule already covers LSASS credential dumping, then recommend the cheapest route: nothing, enable, install, or create.',
                },
                metadata: {
                  query_intent: 'Gap Intent Without Logic',
                  expectedSkill: 'detection-coverage',
                },
              },
              {
                input: {
                  question:
                    'We have no coverage for Okta MFA fatigue attacks. What should I do about it?',
                },
                output: {
                  expected:
                    'I will search installed rules and the installable prebuilt catalog for Okta MFA abuse coverage and return one verdict with the recommended action.',
                },
                metadata: {
                  query_intent: 'Reported Gap',
                  expectedSkill: 'detection-coverage',
                },
              },
              {
                input: {
                  question:
                    'I want a rule that covers suspicious kubectl exec into production pods.',
                },
                output: {
                  expected:
                    'Before drafting anything I will check whether an installed or installable rule already covers kubectl exec into production pods, because enabling or installing an existing rule is cheaper than a new rule.',
                },
                metadata: {
                  query_intent: 'Imperative Without Logic',
                  expectedSkill: 'detection-coverage',
                },
              },
              {
                input: {
                  question:
                    'A hunt found undetected DNS tunneling over TXT records. We need this covered.',
                },
                output: {
                  expected:
                    'I will treat the hunt finding as a coverage gap, check installed and installable rules for DNS tunneling detection, and return one verdict with a route.',
                },
                metadata: {
                  query_intent: 'Hunt Finding',
                  expectedSkill: 'detection-coverage',
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'reporting intents and pre-specified rules route to sibling skills, not detection-coverage',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-detection-coverage-distractors',
            description:
              'Distractors that mention rules or coverage but are not requests to close a ' +
              'gap: inventory questions belong to find-security-rules, deployment-wide ' +
              'advisory to recommend-prebuilt-rules, and a request that already carries the ' +
              'detection logic goes straight to detection-rule-edit with no coverage check.',
            examples: [
              {
                input: { question: 'Do we have a rule for MITRE technique T1059?' },
                output: {
                  expected:
                    'I will list the installed detection rules mapped to T1059 and answer the question. This is an inventory lookup, not a request to close a gap.',
                },
                metadata: {
                  query_intent: 'Inventory Question',
                  expectedSkill: 'find-security-rules',
                },
              },
              {
                input: { question: 'How many of my detection rules are currently disabled?' },
                output: {
                  expected:
                    'I will count the installed rules whose enabled state is false and report the total.',
                },
                metadata: {
                  query_intent: 'Inventory Count',
                  expectedSkill: 'find-security-rules',
                },
              },
              {
                input: { question: 'What detection rules should I install for my environment?' },
                output: {
                  expected:
                    'I will recommend Elastic prebuilt rules to install based on the data sources present and where installed coverage is thin.',
                },
                metadata: {
                  query_intent: 'Deployment Advisory',
                  expectedSkill: 'recommend-prebuilt-rules',
                },
              },
              {
                input: {
                  question:
                    'Create a new ES|QL detection rule on logs-endpoint.events.* that alerts when process.name is certutil.exe and process.args contains urlcache. Severity high, interval 10m.',
                },
                output: {
                  expected:
                    'The detection logic and parameters are already specified, so I will build that rule directly instead of checking whether something similar exists.',
                },
                metadata: {
                  query_intent: 'Logic Already Specified',
                  expectedSkill: 'detection-rule-edit',
                },
              },
            ],
          },
        });
      }
    );
  }
);
