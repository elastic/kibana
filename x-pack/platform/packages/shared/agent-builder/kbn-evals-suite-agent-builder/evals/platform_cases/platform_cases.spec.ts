/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Platform Cases Skill Evaluations
 *
 * Tests the DEFAULT agent's ability to use the cases tool.
 * Uses the default agent (elastic-ai-agent) to test the real user experience.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

// Set default evaluators for this spec
// Focus on tool usage, grounding, and relevance - skip Factuality which requires exact content matching
const SPEC_EVALUATORS = ['ToolUsageOnly', 'Groundedness', 'Relevance', 'Sequence Accuracy'];
if (!process.env.SELECTED_EVALUATORS) {
  process.env.SELECTED_EVALUATORS = SPEC_EVALUATORS.join(',');
}

interface CreateCaseResponse {
  id: string;
  title: string;
  version: string;
}

const CASES_API_BASE_PATH = '/api/cases';

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, phoenixClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          phoenixClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('Platform Cases Skill', { tag: '@svlOblt' }, () => {
  const createdCaseIds: string[] = [];

  evaluate.beforeAll(async ({ fetch, log }) => {
    // Create test cases for evaluation
    log.info('Creating test cases for evaluation');

    // Create a high severity open case
    const highSeverityCase = (await fetch(CASES_API_BASE_PATH, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Critical Security Incident - Malware Detection',
        description:
          'Detected potential malware activity on production servers. Immediate investigation required. Multiple endpoints showing suspicious network connections.',
        tags: ['security', 'malware', 'critical'],
        severity: 'critical',
        owner: 'cases',
        connector: { id: 'none', name: 'none', type: '.none', fields: null },
        settings: { syncAlerts: false },
      }),
    })) as CreateCaseResponse;
    createdCaseIds.push(highSeverityCase.id);
    log.debug(`Created high severity case: ${highSeverityCase.id}`);

    // Create a medium severity case about phishing
    const phishingCase = (await fetch(CASES_API_BASE_PATH, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Phishing Campaign Investigation',
        description:
          'Multiple employees reported receiving suspicious emails with links to credential harvesting sites. Initial analysis suggests targeted phishing campaign.',
        tags: ['security', 'phishing', 'investigation'],
        severity: 'medium',
        owner: 'cases',
        connector: { id: 'none', name: 'none', type: '.none', fields: null },
        settings: { syncAlerts: false },
      }),
    })) as CreateCaseResponse;
    createdCaseIds.push(phishingCase.id);
    log.debug(`Created phishing case: ${phishingCase.id}`);

    // Create an in-progress case
    const inProgressCase = (await fetch(CASES_API_BASE_PATH, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Network Performance Degradation',
        description:
          'Users reporting slow network performance in building A. Network team investigating potential issues with core switches.',
        tags: ['network', 'performance'],
        severity: 'low',
        owner: 'cases',
        connector: { id: 'none', name: 'none', type: '.none', fields: null },
        settings: { syncAlerts: false },
      }),
    })) as CreateCaseResponse;
    createdCaseIds.push(inProgressCase.id);

    // Update the case to in-progress status
    await fetch(CASES_API_BASE_PATH, {
      method: 'PATCH',
      body: JSON.stringify({
        cases: [
          {
            id: inProgressCase.id,
            version: inProgressCase.version,
            status: 'in-progress',
          },
        ],
      }),
    });
    log.debug(`Created and updated in-progress case: ${inProgressCase.id}`);

    // Add a comment to the phishing case
    await fetch(`${CASES_API_BASE_PATH}/${phishingCase.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'user',
        comment:
          'Initial triage complete. Identified 15 employees who clicked the phishing link. Password resets initiated.',
        owner: 'cases',
      }),
    });
    log.debug(`Added comment to phishing case`);

    // Create a closed case
    const closedCase = (await fetch(CASES_API_BASE_PATH, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Resolved: Database Connection Timeout',
        description:
          'Database connection timeouts affecting application performance. Root cause identified as connection pool exhaustion.',
        tags: ['database', 'resolved'],
        severity: 'high',
        owner: 'cases',
        connector: { id: 'none', name: 'none', type: '.none', fields: null },
        settings: { syncAlerts: false },
      }),
    })) as CreateCaseResponse;
    createdCaseIds.push(closedCase.id);

    // Close the case
    await fetch(CASES_API_BASE_PATH, {
      method: 'PATCH',
      body: JSON.stringify({
        cases: [
          {
            id: closedCase.id,
            version: closedCase.version,
            status: 'closed',
          },
        ],
      }),
    });
    log.debug(`Created and closed case: ${closedCase.id}`);
  });

  evaluate.afterAll(async ({ fetch, log }) => {
    // Clean up created cases
    for (const caseId of createdCaseIds) {
      try {
        await fetch(`${CASES_API_BASE_PATH}?ids=${encodeURIComponent(JSON.stringify([caseId]))}`, {
          method: 'DELETE',
        });
        log.debug(`Deleted case: ${caseId}`);
      } catch (e) {
        log.warning(
          `Failed to delete case "${caseId}": ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
  });

  evaluate('list and search cases', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform cases: list and search',
        description: 'Evaluation scenarios for listing and searching cases with various filters',
        examples: [
          {
            input: {
              question: 'List all open cases',
            },
            output: {
              expected: `Found open cases. Lists cases with open status including Critical Security Incident and Phishing Campaign Investigation with their titles, IDs, and status.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
          {
            input: {
              question: 'Show me all critical severity cases',
            },
            output: {
              expected: `Found 1 critical case: Critical Security Incident - Malware Detection. Shows case ID, title, status and severity.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
          {
            input: {
              question: 'Find cases related to security incidents',
            },
            output: {
              expected: `Found security-related cases including Critical Security Incident about malware and Phishing Campaign Investigation. Lists titles, IDs, severity and status.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
          {
            input: {
              question: 'What cases are currently in progress?',
            },
            output: {
              expected: `Found in-progress cases. Network Performance Degradation case is in-progress. Shows title, ID, and status.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
          {
            input: {
              question: 'Show me cases with the phishing tag',
            },
            output: {
              expected: `Found 1 case with phishing tag: Phishing Campaign Investigation. Shows case title, ID, status and severity.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
        ],
      },
    });
  });

  evaluate('get case by id', async ({ evaluateDataset }) => {
    const testCaseId = createdCaseIds[0]; // The malware case

    await evaluateDataset({
      dataset: {
        name: 'platform cases: get by id',
        description: 'Evaluation scenarios for retrieving specific cases by their ID',
        examples: [
          {
            input: {
              question: `Get the details of case ${testCaseId}`,
            },
            output: {
              expected: `The response should contain:
- Full case details (title, description)
- Status and severity information
- Tags assigned to the case
- Markdown link to access the case`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
          {
            input: {
              question: `What is the current status and severity of case ${testCaseId}?`,
            },
            output: {
              expected: `The response should contain:
- Current status of the case
- Severity level (critical for malware case)
- Additional context about the case
- Link to access it`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
        ],
      },
    });
  });

  evaluate('search with multiple filters', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform cases: complex filters',
        description: 'Evaluation scenarios for searching cases with multiple filter combinations',
        examples: [
          {
            input: {
              question: 'Find high or critical severity cases that are not closed',
            },
            output: {
              expected: `The response should contain:
- High or critical severity cases
- Excludes closed cases
- The malware case should be included
- Status and severity for each result`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
          {
            input: {
              question: 'Search for cases mentioning malware in the title or description',
            },
            output: {
              expected: `The response should contain:
- Cases matching malware search
- The Critical Security Incident case
- Relevant description excerpts
- Links to the cases`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
          {
            input: {
              question: 'List all closed cases with high severity',
            },
            output: {
              expected: `The response should contain:
- Closed cases with high severity
- The database connection timeout case
- Status and resolution info
- Links to the cases`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
        ],
      },
    });
  });

  evaluate('case comments and details', async ({ evaluateDataset }) => {
    const phishingCaseId = createdCaseIds[1]; // The phishing case with comment

    await evaluateDataset({
      dataset: {
        name: 'platform cases: comments',
        description: 'Evaluation scenarios for retrieving case comments and detailed information',
        examples: [
          {
            input: {
              question: `Show me case ${phishingCaseId} with all its comments`,
            },
            output: {
              expected: `The response should contain:
- Phishing case full details
- Comment about initial triage
- Information about 15 employees and password resets
- Timeline of case activity`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
          {
            input: {
              question: 'What progress has been made on the phishing investigation case?',
            },
            output: {
              expected: `The response should contain:
- Case details and current status
- Triage comment mentioning 15 employees
- Password reset information
- Link to the case for full details`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
        ],
      },
    });
  });

  evaluate('case summary queries', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform cases: summaries',
        description: 'Evaluation scenarios for summarizing case information',
        examples: [
          {
            input: {
              question: 'Give me a summary of all active cases',
            },
            output: {
              expected: `The response should contain:
- Count of active (open/in-progress) cases
- Severity distribution summary
- Brief descriptions of each case
- Links to access each case`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
          {
            input: {
              question: 'How many security-related cases do we have and what are their statuses?',
            },
            output: {
              expected: `The response should contain:
- Count of security-tagged cases
- Status breakdown (open, in-progress, closed)
- Brief overview of each
- Links to the cases`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
          {
            input: {
              question: 'What are the most critical issues we are currently tracking?',
            },
            output: {
              expected: `The response should contain:
- High/critical severity active cases
- The malware detection case prominently
- Brief descriptions and impact
- Links to the cases`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
        ],
      },
    });
  });
});
