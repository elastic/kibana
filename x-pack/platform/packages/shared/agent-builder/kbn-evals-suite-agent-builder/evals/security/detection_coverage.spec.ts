/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { tags } from '@kbn/scout';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';
import { COVERAGE_RULE_NAMES, seedDetectionCoverageFixtures } from './detection_coverage_fixtures';

/**
 * Evals for the `detection-coverage` skill. Three kinds live in this file:
 *
 * 1. **Verdict correctness** (deterministic `converse` + `expect`). The skill must return
 *    exactly one of five verdict tokens for a seeded situation, and name the rule that
 *    justifies it. These read the answer text and the `security.find_rules` /
 *    `security.find_prebuilt_rules` tool calls, so a right verdict for the wrong reason
 *    still fails. Two of them are traps that previously produced wrong verdicts:
 *    behaviour-in-description-only, and same-technique-different-behaviour.
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
const REDIRECT_TOOL_ID = 'security.build_redirect_url';

const FLEET_BULK_INSTALL_PATH = '/api/fleet/epm/packages/_bulk';

/** Every verdict the skill may return; asserting "exactly one" needs the whole set. */
const ALL_VERDICTS = [
  'covered_enabled',
  'covered_disabled',
  'prebuilt_available',
  'no_coverage',
] as const;

type Verdict = (typeof ALL_VERDICTS)[number];

interface ToolCallStep {
  type?: string;
  tool_id?: string;
  params?: Record<string, unknown>;
  results?: unknown[];
}

const toolCalls = (steps: ToolCallStep[], toolId: string): ToolCallStep[] =>
  steps.filter((step) => step?.type === 'tool_call' && step.tool_id === toolId);

/**
 * The verdict the answer actually commits to.
 *
 * The skill is told to lead with one verdict token. Mentioning several would make the
 * recommendation ambiguous for a human and unusable for the workflow, so a multi-verdict
 * answer is a failure, not a pass with noise.
 */
const verdictsMentioned = (answer: string): Verdict[] =>
  ALL_VERDICTS.filter((verdict) => answer.includes(verdict));

/**
 * Fail with the actual cause when a verdict is missing.
 *
 * Two very different things produce "no verdict": the router never selected this skill
 * (so another skill answered, and no verdict was ever owed), or the skill ran and did not
 * state one. Asserting the skill loaded first turns a confusing empty-array diff into the
 * real diagnosis.
 */
const expectCoverageSkillRan = (steps: ToolCallStep[]) => {
  const loaded = steps
    .filter((step) => step?.type === 'tool_call' && step.tool_id === 'load_skill')
    .map((step) => String((step.params as { skill?: unknown })?.skill ?? ''));
  expect(
    loaded.some((skill) => skill.includes('detection-coverage')),
    `routing miss: the agent never loaded detection-coverage (loaded: ${
      loaded.join(', ') || 'none'
    })`
  ).toBe(true);
};

const expectSingleVerdict = (answer: string, expected: Verdict) => {
  expect(
    verdictsMentioned(answer),
    `expected exactly one verdict token (${expected}) in the answer`
  ).toEqual([expected]);
};

/**
 * The assistant's final answer. `converse` returns the whole message list, so the reply
 * under test is the last entry, not a `message` field on the response.
 */
const answerOf = (response: { messages: Array<{ message: string }> }): string =>
  response.messages[response.messages.length - 1]?.message ?? '';

/** Case-insensitive: the answer may bold or re-case a rule name. */
const mentionsRule = (answer: string, ruleName: string): boolean =>
  answer.toLowerCase().includes(ruleName.toLowerCase());

evaluate.describe(
  'Security Skills - Detection Coverage verdicts',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    let teardown: (() => Promise<void>) | undefined;

    evaluate.beforeAll(async ({ kbnClient, log }) => {
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
    });

    evaluate.afterAll(async () => {
      await teardown?.();
    });

    evaluate(
      'an enabled exact match returns covered_enabled and names that rule',
      async ({ chatClient }) => {
        const response = await chatClient.converse({
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
        expect(answerOf(response)).not.toMatch(/\bI (?:have )?enabled\b/i);
      }
    );

    evaluate(
      'a behaviour described only in a rule description is still found',
      async ({ chatClient }) => {
        // Trap: the rule name says nothing about DNS. A name-only search returns nothing
        // here, and the skill then reports a false gap over a rule the user already runs.
        const response = await chatClient.converse({
          messages: [
            {
              message: 'I need coverage for attackers exfiltrating data over DNS TXT tunneling.',
            },
          ],
        });

        expectCoverageSkillRan((response.steps ?? []) as ToolCallStep[]);
        expectSingleVerdict(answerOf(response), 'covered_enabled');
        expect(mentionsRule(answerOf(response), COVERAGE_RULE_NAMES.dnsTunneling)).toBe(true);
      }
    );

    evaluate('sharing a MITRE technique is not coverage on its own', async ({ chatClient }) => {
      // Trap: two enabled fixtures carry T1059, but neither detects a Linux Python
      // reverse shell. A technique-level match here would hide a real gap.
      const response = await chatClient.converse({
        messages: [
          {
            message: 'I need detection for Python reverse shells on Linux servers.',
          },
        ],
      });

      expectCoverageSkillRan((response.steps ?? []) as ToolCallStep[]);
      const verdicts = verdictsMentioned(answerOf(response));
      expect(verdicts).toHaveLength(1);
      expect(
        ['no_coverage', 'prebuilt_available'],
        'a Linux Python reverse shell is not covered by the Windows T1059 fixtures'
      ).toContain(verdicts[0]);
      expect(mentionsRule(answerOf(response), COVERAGE_RULE_NAMES.powershell)).toBe(false);
      expect(mentionsRule(answerOf(response), COVERAGE_RULE_NAMES.officeCmd)).toBe(false);
    });

    evaluate(
      'a rule that is close but too narrow returns no_coverage and names the close rule',
      async ({ chatClient }) => {
        const response = await chatClient.converse({
          messages: [
            {
              message: 'We need detection for kubectl exec into pods in production namespaces.',
            },
          ],
        });

        expectCoverageSkillRan((response.steps ?? []) as ToolCallStep[]);
        // A too-narrow rule is not coverage: the verdict is no_coverage, but the close rule
        // must be named so the analyst can decide to widen it instead of creating a duplicate.
        expectSingleVerdict(answerOf(response), 'no_coverage');
        expect(mentionsRule(answerOf(response), COVERAGE_RULE_NAMES.kubectlStaging)).toBe(true);
      }
    );

    evaluate(
      'an uninstalled prebuilt rule returns prebuilt_available and is checked against installed rules first',
      async ({ chatClient }) => {
        const response = await chatClient.converse({
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
        expect(answerOf(response)).not.toMatch(/\bI (?:have )?installed\b/i);
      }
    );

    evaluate('decides without mutating: no write tool is ever called', async ({ chatClient }) => {
      const response = await chatClient.converse({
        messages: [
          {
            message: 'We need to detect lateral movement over SMB. Just enable whatever covers it.',
          },
        ],
      });

      const steps = (response.steps ?? []) as ToolCallStep[];
      expect(toolCalls(steps, CREATE_RULE_TOOL_ID)).toHaveLength(0);
      // The route still has to be actionable for the user, with a link to the rule page.
      const linked =
        toolCalls(steps, REDIRECT_TOOL_ID).length > 0 ||
        /\/app\/security\/rules/.test(answerOf(response));
      expect(linked, 'an enable route must give the user a way to act').toBe(true);
    });
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
