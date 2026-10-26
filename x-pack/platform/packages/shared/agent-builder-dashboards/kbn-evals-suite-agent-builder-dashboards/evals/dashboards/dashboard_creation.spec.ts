/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { TOOL_ONLY_AGENT_ID, toolOnlyAgentDefinition } from '../../src/tool_only_agent';
import { DASHBOARD_CREATION_EXAMPLES, DASHBOARD_CREATION_TOOL_ONLY_EXAMPLES } from './datasets';

const AGENTS_API_PATH = '/api/agent_builder/agents';
const AGENTS_API_VERSION = '2023-10-31';

evaluate.describe(
  'Agent Builder Dashboards - Dashboard Creation',
  { tag: tags.serverless.search },
  () => {
    const toolOnlyAgentPath = `${AGENTS_API_PATH}/${TOOL_ONLY_AGENT_ID}`;

    evaluate.beforeAll(async ({ fetch, log }) => {
      await fetch('/api/sample_data/logs', { method: 'POST', version: '2023-10-31' });
      // A run that stopped before afterAll leaves the agent behind, and creating it again would conflict.
      await fetch(toolOnlyAgentPath, { method: 'DELETE', version: AGENTS_API_VERSION }).catch(() =>
        log.debug('No leftover tool-only agent')
      );
      await fetch(AGENTS_API_PATH, {
        method: 'POST',
        version: AGENTS_API_VERSION,
        body: JSON.stringify(toolOnlyAgentDefinition),
      });
    });

    evaluate.afterAll(async ({ fetch, log }) => {
      await fetch(toolOnlyAgentPath, { method: 'DELETE', version: AGENTS_API_VERSION }).catch(
        (error: Error) =>
          log.warning(`Failed to delete eval agent "${TOOL_ONLY_AGENT_ID}": ${error.message}`)
      );
    });

    evaluate(
      'creates dashboards that follow the layout and composition rules',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder dashboards: dashboard creation',
            description:
              'Dashboard requests over kibana_sample_data_logs. Scores skill routing, the structure the prompt pins down, layout rules, and composition order.',
            examples: DASHBOARD_CREATION_EXAMPLES,
          },
        });
      }
    );

    evaluate(
      'creates dashboards from the tool description and schema alone',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder dashboards: dashboard creation (tool only)',
            description:
              'The creation requests on an agent with the dashboard tool and discovery tools but no dashboards skill. Approximates an MCP client, which sees only the tool description and input schema; the call source is still an agent, so the dashboard is stored as an attachment. Skill routing is not scored.',
            examples: DASHBOARD_CREATION_TOOL_ONLY_EXAMPLES,
          },
        });
      }
    );
  }
);
