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
import {
  seedInvestigateRuleFixtures,
  type InvestigateRuleFixtures,
} from './investigate_rule_fixtures';

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, traceEsClient, log }, use) => {
      use(createEvaluateDataset({ chatClient, evaluators, executorClient, traceEsClient, log }));
    },
    { scope: 'test' },
  ],
});

/**
 * investigate-rule evals — five seeded scenarios, scored two complementary ways:
 *
 *  1. DETERMINISTIC probe (code-scored, no judge): converse N times per scenario and check
 *     the answer literally recovers the expected diagnosis — e.g. dominant host + count +
 *     benign_positive + exception (A), or dominant user + suppression + unconfirmed (E).
 *     This is the stable instrument; it does not depend on the noisy Factuality judge.
 *
 *  2. LLM-JUDGED quality (Factuality/Groundedness/Relevance vs faithful golds) across all
 *     five diagnostic branches — benign-concentration -> exception (A), confirmed-FP ->
 *     exception-led, query optional (B), open-diffuse -> defer/manual-review (C),
 *     exception-already-exists -> recognise it (D), and concentrated-but-undispositioned ->
 *     suppression not exception (E). The golds describe what a correct answer says for each
 *     seeded pattern (faithful, so the judge isn't fighting the gold).
 */
evaluate.describe(
  'Security Skills - Investigate Rule (Signal Recovery + Quality)',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    let fixtures: InvestigateRuleFixtures | undefined;

    evaluate.beforeAll(async ({ kbnClient, esClient, log }) => {
      fixtures = await seedInvestigateRuleFixtures({ kbnClient, esClient, log });
    });

    evaluate.afterAll(async () => {
      if (fixtures) await fixtures.cleanup();
    });

    evaluate(
      'deterministically recovers the expected diagnosis per scenario',
      async ({ chatClient, log }) => {
        if (!fixtures) throw new Error('Fixtures were not seeded');
        const runs = Number(process.env.SIGNAL_RUNS || 3);

        // Read-only guardrail: the skill must never claim it mutated the rule.
        const falselyApplied = (a: string) =>
          /\bi (?:have |'ve )?(?:added|created|applied|updated|modified|disabled|enabled)\b[^.]*\b(?:exception|rule|suppression|query)\b/.test(
            a
          );

        const a = fixtures.benignConcentration;
        const b = fixtures.falsePositive;
        const c = fixtures.openDiffuse;
        const d = fixtures.existingException;
        const e = fixtures.concentratedOpen;

        // Each scenario's `pass` is a deterministic, judge-free check of the expected
        // diagnosis — stable across runs, unlike the LLM Factuality judge (especially on
        // the hedged deferral answer in scenario C).
        const scenarios: Array<{ key: string; question: string; pass: (ans: string) => boolean }> =
          [
            {
              key: 'A(benign->exception)',
              question:
                `Detection rule ${a.rule.ruleId} is generating a lot of alerts and most of them look ` +
                `like noise. Can you investigate why and tell me how to reduce it?`,
              // Recovers the dominant host AND its count (the entity breakdown must carry
              // numbers, not bare names), the benign_positive disposition, and an exception.
              pass: (ans) =>
                ans.includes(a.dominantHost.toLowerCase()) &&
                ans.includes(String(a.dominantCount)) &&
                /benign[_ ]positive|benign\b/.test(ans) &&
                ans.includes('exception') &&
                !falselyApplied(ans),
            },
            {
              // Confirmed FPs (spread across many hosts). Skill leads with an exception for
              // the confirmed patterns; a query change is an OPTION, not mandated — so the
              // check requires the FP read + an exception, and no longer forces query wording.
              key: 'B(fp->exception-led)',
              question:
                `Rule ${b.rule.ruleId} keeps firing and my analysts keep closing its alerts. ` +
                `What is going on and how should I fix it?`,
              pass: (ans) =>
                /false[_ ]positive/.test(ans) && /exception/.test(ans) && !falselyApplied(ans),
            },
            {
              key: 'C(open->defer)',
              question:
                `Rule ${c.rule.ruleId} is producing a lot of alerts across many hosts. ` +
                `Are these false positives, and what should I do?`,
              // Defers: can't conclude FP + points to per-alert investigation/alert-analysis,
              // and does not falsely claim a fix was applied.
              pass: (ans) =>
                /(can.?t confirm|cannot confirm|insufficient|inconclusive|not enough|undisposition|no .{0,25}disposition)/.test(
                  ans
                ) &&
                /(alert-analysis|investigat|adjudicat|review)/.test(ans) &&
                !falselyApplied(ans),
            },
            {
              key: 'D(fp->exception-exists)',
              question:
                `Rule ${d.rule.ruleId} keeps generating false-positive alerts from host ` +
                `${d.exceptionHost}. How do I stop them?`,
              // Recognises the rule ALREADY has an exception for that host (so it must not
              // recommend adding a duplicate), and does not falsely claim it applied a fix.
              pass: (ans) =>
                ans.includes(d.exceptionHost.toLowerCase()) &&
                ans.includes('exception') &&
                /(already|exist|in place|already have|already covered)/.test(ans) &&
                !falselyApplied(ans),
            },
            {
              // Concentrated on ONE user but ALL open / undispositioned. The skill must NOT
              // auto-recommend a permanent exception here — it should propose suppression
              // (preserves coverage) and/or defer to alert-analysis, while naming the entity.
              key: 'E(concentrated-open->suppression)',
              question:
                `Rule ${e.rule.ruleId} is extremely noisy and almost all of the alerts are from ` +
                `user ${e.dominantUser}. None of them have been triaged yet. What should I do?`,
              pass: (ans) =>
                ans.includes(e.dominantUser.toLowerCase()) &&
                /suppress/.test(ans) &&
                /(alert-analysis|undisposition|no .{0,25}disposition|not .{0,15}confirm|unconfirmed|cannot confirm|can.?t confirm|triage)/.test(
                  ans
                ) &&
                !falselyApplied(ans),
            },
          ];

        const summary: Array<{ key: string; passed: number }> = [];
        for (const s of scenarios) {
          const outcomes: boolean[] = [];
          for (let i = 0; i < runs; i++) {
            const res = await chatClient.converse({ messages: [{ message: s.question }] });
            const ans = (res.messages[res.messages.length - 1]?.message ?? '').toLowerCase();
            const ok = s.pass(ans);
            outcomes.push(ok);
            log.info(`[recovery ${s.key} ${i + 1}/${runs}] => ${ok ? 'PASS' : 'MISS'}`);
            // Log the actual answer on a MISS so failures are diagnosable from the run log
            // alone (no dependency on the trace pipeline being up).
            if (!ok) {
              log.info(`[recovery ${s.key} ${i + 1}/${runs} MISS answer] ${ans.slice(0, 700)}`);
            }
          }
          const passed = outcomes.filter(Boolean).length;
          log.info(`[recovery SUMMARY ${s.key}] ${passed}/${runs}`);
          summary.push({ key: s.key, passed });
        }

        // Assert AFTER every scenario has run, so one failing scenario never hides the
        // others (previously the in-loop expect aborted the remaining scenarios).
        const threshold = Math.ceil(runs / 2);
        for (const r of summary) {
          expect(
            r.passed,
            `${r.key} recovered ${r.passed}/${runs} (need >= ${threshold})`
          ).toBeGreaterThanOrEqual(threshold);
        }
      }
    );

    evaluate(
      'diagnosis quality across the 5 scenarios (LLM-judged)',
      async ({ evaluateDataset }) => {
        if (!fixtures) throw new Error('Fixtures were not seeded');
        const a = fixtures.benignConcentration;
        const b = fixtures.falsePositive;
        const c = fixtures.openDiffuse;
        const d = fixtures.existingException;
        const e = fixtures.concentratedOpen;

        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-investigate-rule-diagnosis-quality',
            description:
              'Validates the investigate-rule diagnosis + remediation for five seeded patterns: ' +
              'benign-concentration (exception), confirmed-FP across hosts (exception-led, query ' +
              'optional), open/undispositioned (defer, no verdict), a noisy host already covered ' +
              'by an existing exception (recognise it, do not duplicate), and concentrated-but-' +
              'undispositioned (suppression, not a permanent exception).',
            examples: [
              {
                input: {
                  question:
                    `Detection rule ${a.rule.ruleId} is generating a lot of alerts and most of them ` +
                    `look like noise. Can you investigate why and tell me how to reduce it?`,
                },
                output: {
                  expected:
                    `The alerts are heavily concentrated on a single host: "${a.dominantHost}" accounts for ` +
                    `${a.dominantCount} of ${a.totalAlerts} (about 80%), and all of those have been closed by ` +
                    `analysts as benign_positive — analyst-confirmed expected activity for a CI/build host. The ` +
                    `remaining alerts are spread thinly across a few other hosts and are still open. The primary ` +
                    `recommended remediation is to add a rule exception for host "${a.dominantHost}" in the ` +
                    `Detection Rules UI (alert suppression by host is a reasonable alternative), which removes the ` +
                    `large majority of the noise. The response only suggests this as a user action and does not ` +
                    `modify the rule itself; it may additionally note that the rule's query is broad.`,
                },
                metadata: {
                  query_intent: 'Benign concentration -> exception',
                  expectedSkill: 'investigate-rule',
                  expectedToolId: 'security.alerts',
                },
              },
              {
                input: {
                  question:
                    `Rule ${b.rule.ruleId} keeps firing and my analysts keep closing its alerts. ` +
                    `What is going on and how should I fix it?`,
                },
                output: {
                  expected:
                    `About ${b.fpCount} of ${b.totalAlerts} of this rule's alerts (~90%) have been closed by ` +
                    `analysts as false_positive, spread across roughly a dozen hosts with no single dominant ` +
                    `entity. Because these are analyst-confirmed false positives, the immediate, always-safe ` +
                    `remediation is to add exceptions for the confirmed patterns in the Detection Rules UI — that ` +
                    `is the action to lead with. Since the false positives are spread across many hosts, a ` +
                    `per-host exception would mean many separate entries, so narrowing or rewriting the rule query ` +
                    `is a reasonable alternative to consider as well, at the analyst's judgement (it may note the ` +
                    `query looks over-broad); disabling the rule meanwhile is a reasonable stopgap. The response ` +
                    `only suggests these as user actions, leads with the exception rather than mandating a query ` +
                    `change, and does not modify the rule itself.`,
                },
                metadata: {
                  query_intent: 'False positive across hosts -> exception-led, query optional',
                  expectedSkill: 'investigate-rule',
                  expectedToolId: 'security.alerts',
                },
              },
              {
                input: {
                  question:
                    `Rule ${c.rule.ruleId} is producing a lot of alerts across many hosts. ` +
                    `Are these false positives, and what should I do?`,
                },
                output: {
                  expected:
                    `These alerts cannot be confirmed as false positives from the available data: all ` +
                    `${c.totalAlerts} are still open and undispositioned (no analyst has closed any as ` +
                    `false_positive or benign_positive), and they are spread evenly across about ${c.hostCount} ` +
                    `hosts with no dominant entity. The activity itself — outbound RDP to external destinations — ` +
                    `is genuinely unusual and could be a real threat (e.g. lateral movement), so it should not be ` +
                    `dismissed as noise without investigation. The right next step is to investigate before tuning: ` +
                    `adjudicate a sample of the alerts (the alert-analysis skill can produce a per-alert verdict). ` +
                    `Only if the destinations or hosts turn out to be expected should a scoped exception (by ` +
                    `destination, process, or host) be suggested in the Detection Rules UI; the already-tight query ` +
                    `should not be broadly narrowed. The response is read-only and does not assert a verdict.`,
                },
                metadata: {
                  query_intent: 'Open/undispositioned -> defer, no verdict',
                  expectedSkill: 'investigate-rule',
                  expectedToolId: 'security.alerts',
                },
              },
              {
                input: {
                  question:
                    `Rule ${d.rule.ruleId} keeps generating false-positive alerts from host ` +
                    `${d.exceptionHost}. How do I stop them?`,
                },
                output: {
                  expected:
                    `The false-positive alerts (${d.fpCount} of ${d.totalAlerts}) are concentrated on host ` +
                    `"${d.exceptionHost}", and the rule ALREADY has an exception covering that host. The correct ` +
                    `response recognises that existing exception rather than recommending a new one. If alerts are ` +
                    `still being generated from that host, the existing exception is not taking effect — likely ` +
                    `because the entry value/field does not match the alerts, or it is on the wrong list or ` +
                    `namespace — so the user should verify and repair that exception in the Detection Rules UI. ` +
                    `The response is read-only and does not claim to have modified the rule or the exception.`,
                },
                metadata: {
                  query_intent: 'FP host already covered by an existing exception',
                  expectedSkill: 'investigate-rule',
                  expectedToolId: 'security.alerts',
                },
              },
              {
                input: {
                  question:
                    `Rule ${e.rule.ruleId} is extremely noisy and almost all of the alerts are from ` +
                    `user ${e.dominantUser}. None of them have been triaged yet. What should I do?`,
                },
                output: {
                  expected:
                    `Almost all of this rule's alerts (${e.dominantCount} of ${e.totalAlerts}, ~88%) are ` +
                    `concentrated on a single user, "${e.dominantUser}", spread across several hosts, and none of ` +
                    `them have been dispositioned by analysts (no alert is closed as false_positive or ` +
                    `benign_positive). The concentration suggests this may be automated or service-account noise, ` +
                    `but that is unconfirmed from the data alone. Because there is no analyst-confirmed ` +
                    `disposition, the response must NOT recommend a permanent exception as the fix; instead it ` +
                    `recommends alert suppression on user.name "${e.dominantUser}" (which reduces the noise while ` +
                    `preserving detection coverage), and/or offers to adjudicate a sample of the alerts (the ` +
                    `alert-analysis skill can produce a per-alert verdict). An exception is appropriate only if ` +
                    `the analyst already knows the account is benign. The response is read-only, presents these ` +
                    `as user actions, and does not assert that the alerts are confirmed false positives.`,
                },
                metadata: {
                  query_intent: 'Concentrated but undispositioned -> suppression, not exception',
                  expectedSkill: 'investigate-rule',
                  expectedToolId: 'security.alerts',
                },
              },
            ],
          },
        });
      }
    );
  }
);
