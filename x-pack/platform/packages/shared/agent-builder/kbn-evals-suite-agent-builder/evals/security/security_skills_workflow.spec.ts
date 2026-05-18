/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

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

// Spec variant for the workflow-shaped alert-analysis skill (alertAnalysisApiDrivenSkill).
// The correlate example here expects platform.workflows.workflow_execute_step + a
// kibana.request to the internal related-alerts API path. The current
// security_skills.spec.ts expects security.alert-analysis.get-related-alerts and is
// the fair grading surface for v1 (legacy inline) and v3 (inline-api-tool refactor).
//
// This file is paired with the B3 / v6 evaluator additions in src/evaluate_dataset.ts
// (Workflow_Yaml_Validity, Workflow_PreValidation_PassRate,
//  Workflow_Execution_SuccessRate, Discovery_First_Pattern_Usage,
//  Cost_Per_Successful_Outcome, Variance_Of_Cost). Examples carry
// `variantFamily: 'workflow'` so those evaluators know to fire here, and the
// non-workflow examples below also carry it so the evaluators can short-circuit
// to `not_applicable` when no workflow_execute_step calls were made.
evaluate.describe(
  'Security Skills - Alert Analysis (workflow-shaped variant)',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate(
      'alert analysis queries activate the workflow-shaped alert-analysis skill and tools',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-alert-analysis-skill-workflow',
            description:
              'Validates that alert triage queries activate the workflow-shaped ' +
              'alert-analysis skill (alertAnalysisApiDrivenSkill) and use ' +
              'platform.workflows.workflow_execute_step + kibana.request for ' +
              'internal Security Solution API correlation calls. Pair with the ' +
              'security_skills.spec.ts inline-shaped spec for the v1/v3 grading.',
            examples: [
              {
                input: {
                  question:
                    'I have a critical severity alert for "Credential Access via LSASS Memory" on host WIN-SRV01. Help me triage this alert.',
                },
                output: {
                  expected:
                    'I will help triage this LSASS credential access alert by first fetching the alert details, then searching for related alerts on WIN-SRV01, checking threat intelligence in Security Labs, and assessing the host risk score.',
                },
                metadata: {
                  query_intent: 'Alert Triage',
                  expectedSkill: 'alert-analysis',
                  variantFamily: 'workflow',
                },
              },
              {
                input: {
                  question:
                    'Show me all high and critical severity alerts from the last 24 hours and help me prioritize which ones to investigate first.',
                },
                output: {
                  expected:
                    'I will search for high and critical severity alerts from the past 24 hours, correlate them with entity risk scores, and prioritize based on severity, affected entity criticality, and MITRE ATT&CK technique.',
                },
                metadata: {
                  query_intent: 'Alert Triage',
                  expectedSkill: 'alert-analysis',
                  expectedOnlyToolId: 'security.alerts',
                  variantFamily: 'workflow',
                },
              },
              {
                input: {
                  question:
                    'Search Security Labs for information about the Lazarus Group and their known attack techniques.',
                },
                output: {
                  expected:
                    'I will search Elastic Security Labs for threat intelligence on the Lazarus Group, including their known TTPs, malware families, and indicators of compromise.',
                },
                metadata: {
                  query_intent: 'Threat Intelligence',
                  expectedSkill: 'alert-analysis',
                  expectedOnlyToolId: 'security.security_labs_search',
                  variantFamily: 'workflow',
                },
              },
              {
                input: {
                  question:
                    'What is the current risk score for host DC01? Has it changed recently?',
                },
                output: {
                  expected:
                    'I will look up the entity risk score for host DC01 to assess its current risk level and any recent changes in risk indicators.',
                },
                metadata: {
                  query_intent: 'Risk Assessment',
                  expectedSkill: 'alert-analysis',
                  expectedOnlyToolId: 'security.entity_risk_score',
                  variantFamily: 'workflow',
                },
              },
              {
                input: {
                  question:
                    'Correlate related alerts for alert id "test-alert-id-123" over the last 24 hours and summarize shared entities I should investigate.',
                },
                output: {
                  expected:
                    'I will call the related alerts internal API for alert test-alert-id-123 and summarize correlated entities from the last 24 hours.',
                },
                metadata: {
                  query_intent: 'Alert Correlation',
                  expectedSkill: 'alert-analysis',
                  expectedToolId: 'platform.workflows.workflow_execute_step',
                  expectedWorkflowRequestPath:
                    '/internal/security_solution/alert_analysis/related_alerts',
                  expectedWorkflowStepType: 'kibana.request',
                  variantFamily: 'workflow',
                },
              },
            ],
          },
        });
      }
    );
  }
);
