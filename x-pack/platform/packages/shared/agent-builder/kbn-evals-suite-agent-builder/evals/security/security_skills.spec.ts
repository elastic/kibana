/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

evaluate.describe('Security Skills - Threat Hunting', () => {
  evaluate(
    'threat hunting queries activate the correct skill and tools',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: security-threat-hunting-skill',
          description:
            'Validates that threat hunting queries activate the threat-hunting skill and use ES|QL tools',
          examples: [
            {
              input: {
                question:
                  'Hunt for lateral movement in my environment. Look for remote service creation and suspicious logon types over the last 7 days.',
              },
              output: {
                expected:
                  'I will search for lateral movement indicators using ES|QL queries across endpoint and Windows event logs, looking for tools like psexec, wmic, and suspicious logon types 3 and 10.',
              },
              metadata: {
                query_intent: 'Threat Hunting',
                expectedSkill: 'threat-hunting',
              },
            },
            {
              input: {
                question:
                  'Are there any signs of C2 beaconing in our network logs? Check for processes making periodic outbound connections to external IPs.',
              },
              output: {
                expected:
                  'I will analyze network connection logs for periodic patterns to external IP addresses, focusing on process-level connection counts and frequency to identify potential C2 beaconing behavior.',
              },
              metadata: {
                query_intent: 'Threat Hunting',
                expectedSkill: 'threat-hunting',
              },
            },
            {
              input: {
                question:
                  'Find statistically rare process executions across our endpoints. Which processes have only run on a single host with fewer than 3 executions in the past week?',
              },
              output: {
                expected:
                  'I will query the endpoint process event logs using ES|QL to identify processes with a unique host count of 1 and execution count under 3, which are statistically rare and may indicate malicious activity.',
              },
              metadata: {
                query_intent: 'Threat Hunting',
                expectedSkill: 'threat-hunting',
              },
            },
            {
              input: {
                question:
                  'Check for brute force login attempts in the last 24 hours. Show me source IPs with more than 10 failed authentication attempts.',
              },
              output: {
                expected:
                  'I will search authentication event logs for failed login attempts, aggregated by source IP, to identify potential brute force attacks with more than 10 failures from the same source.',
              },
              metadata: {
                query_intent: 'Threat Hunting',
                expectedSkill: 'threat-hunting',
              },
            },
            {
              input: {
                question: 'What indices are available for security hunting in this environment?',
              },
              output: {
                expected:
                  'I will list the available indices to identify security-relevant data sources for threat hunting, such as endpoint, network, and authentication logs.',
              },
              metadata: {
                query_intent: 'Threat Hunting',
                expectedSkill: 'threat-hunting',
                expectedOnlyToolId: 'platform.core.list_indices',
              },
            },
          ],
        },
      });
    }
  );
});

evaluate.describe('Security Skills - Alert Analysis', () => {
  evaluate(
    'alert analysis queries activate the correct skill and tools',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: security-alert-analysis-skill',
          description:
            'Validates that alert triage queries activate the alert-analysis skill and appropriate security tools',
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
              },
            },
          ],
        },
      });
    }
  );
});

evaluate.describe('Security Skills - Detection Engineering', () => {
  evaluate(
    'detection engineering queries activate the correct skill and tools',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: security-detection-engineering-skill',
          description:
            'Validates that detection rule creation and exception management queries activate the detection-engineering skill',
          examples: [
            {
              input: {
                question:
                  'Create a detection rule for PowerShell encoded command execution that could indicate obfuscated malicious scripts.',
              },
              output: {
                expected:
                  'I will create a detection rule that looks for PowerShell processes launched with encoded command arguments (-enc, -encodedcommand, -e), mapped to MITRE ATT&CK T1059.001 (Command and Scripting Interpreter: PowerShell).',
              },
              metadata: {
                query_intent: 'Rule Creation',
                expectedSkill: 'detection-engineering',
                expectedOnlyToolId: 'security.create_detection_rule',
              },
            },
            {
              input: {
                question:
                  'The rule "Suspicious PowerShell Execution" is generating too many false positives from our CI/CD pipeline. Create an exception for the jenkins service account running powershell with -encodedcommand.',
              },
              output: {
                expected:
                  'I will create an exception on the detection rule that excludes PowerShell execution by the jenkins service account with encoded command arguments, since this is a known benign pattern from your CI/CD pipeline.',
              },
              metadata: {
                query_intent: 'Exception Management',
                expectedSkill: 'detection-engineering',
                expectedOnlyToolId: 'security.manage_rule_exceptions',
              },
            },
            {
              input: {
                question:
                  'What MITRE ATT&CK techniques do we currently have detection rules for? Show me our coverage gaps.',
              },
              output: {
                expected:
                  'I will search attack discovery data to assess your current detection coverage across MITRE ATT&CK techniques and identify gaps where new rules should be created.',
              },
              metadata: {
                query_intent: 'Coverage Analysis',
                expectedSkill: 'detection-engineering',
                expectedOnlyToolId: 'security.attack_discovery_search',
              },
            },
          ],
        },
      });
    }
  );
});

evaluate.describe('Security Skills - Distractor Queries', () => {
  evaluate('non-security queries do not activate security skills', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'agent builder: security-skills-distractor',
        description:
          'Validates that non-security queries do NOT activate security skills (negative test)',
        examples: [
          {
            input: {
              question: 'Show me the available dashboards in Kibana.',
            },
            output: {
              expected:
                'I will search for available dashboards. This is a platform query, not a security-specific task.',
            },
            metadata: {
              query_intent: 'Platform',
              shouldNotActivateSkill: 'threat-hunting',
            },
          },
          {
            input: {
              question: 'What is the current status of my APM services?',
            },
            output: {
              expected:
                'I will check the status of your APM services. This is an observability query.',
            },
            metadata: {
              query_intent: 'Observability',
              shouldNotActivateSkill: 'alert-analysis',
            },
          },
          {
            input: {
              question: 'Help me create an index template for my application logs.',
            },
            output: {
              expected:
                'I will help you create an index template. This is a platform/data management task.',
            },
            metadata: {
              query_intent: 'Platform',
              shouldNotActivateSkill: 'detection-engineering',
            },
          },
        ],
      },
    });
  });
});
