/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationDataset, KibanaPhoenixClient } from '@kbn/evals';
import { createEsqlEquivalenceEvaluator } from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ExperimentTask } from '@kbn/evals/src/types';
import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type { TaskOutput } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import { platformCoreTools } from '@kbn/onechat-common';
import type { OnechatEvaluationChatClient } from '../../src/chat_client';
import { evaluate as base } from '../../src/evaluate';

export type EvaluateDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: {
    name: string;
    description: string;
    examples: DatasetExample[];
  };
}) => Promise<void>;

interface DatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    expected: string;
    query: string;
  };
}

interface ToolResult {
  data?: { esql?: string };
  type?: string;
}

function createEvaluateDataset({
  phoenixClient,
  chatClient,
  inferenceClient,
  log,
}: {
  phoenixClient: KibanaPhoenixClient;
  chatClient: OnechatEvaluationChatClient;
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): EvaluateDataset {
  return async function evaluateDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: DatasetExample[];
    };
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    const executeToolTask: ExperimentTask<DatasetExample, TaskOutput> = async ({ input }) => {
      const response = await chatClient.executeTool({
        toolId: platformCoreTools.search,
        toolParams: { query: input.question },
      });

      const esql = (response.results as ToolResult[])
        .filter((r) => r.type === 'query')
        .map((r) => r.data?.esql)
        .filter(Boolean)
        .join('\n');

      return {
        results: response.results,
        errors: response.errors,
        esql,
      };
    };

    const esqlEquivalenceEvaluator = createEsqlEquivalenceEvaluator({
      inferenceClient,
      log,
    });

    await phoenixClient.runExperiment(
      {
        dataset,
        task: executeToolTask,
      },
      [esqlEquivalenceEvaluator]
    );
  };
}

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, phoenixClient, inferenceClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          phoenixClient,
          inferenceClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});
evaluate.describe('ES|QL tool evaluation', { tag: '@svlSearch' }, () => {
  evaluate('analytical queries', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'onechat: default-agent-analytical-queries',
        description: 'Dataset containing Analytical queries',
        examples: [
          {
            input: { question: 'When did tina.jackson@gray-smith.com signup' },
            output: {
              expected: `Oct 23, 2024 at 05:42:03`,
              query: `FROM users
| WHERE email == "tina.jackson@gray-smith.com"
| KEEP created_at`,
            },
            metadata: {
              query_intent: 'Factual',
            },
          },
          {
            input: { question: 'What is the id of the project that was deleted most recently' },
            output: {
              expected: `id: 6138da66-1f68-4ff7-bb96-33af19a3a13e; deleted_at: Oct 23, 2024 @ 15:51:21.000`,
              query: `FROM projects
| WHERE deleted_at IS NOT NULL
| SORT deleted_at DESC
| LIMIT 1
| KEEP id, deleted_at`,
            },
            metadata: {
              query_intent: 'Factual - Temporal',
            },
          },
          {
            input: {
              question:
                'What is the id of the project with highest daily average error count between Jun 2024 to Dec 2024',
            },
            output: {
              expected: `5ed20eb2-4b16-422e-95ea-e2357378a2fa`,
              query: `FROM error_rate_daily
| WHERE date >= "2024-06-01" AND date <= "2024-12-31"
| STATS avg_daily_errors = AVG(error_count) BY project_id
| SORT avg_daily_errors DESC
| LIMIT 1
| KEEP project_id`,
            },
            metadata: {
              query_intent: 'Factual - Temporal',
            },
          },
          {
            input: {
              question:
                'Which project has the maximum avergae error rate? At what date that project had the maximum error rate?',
            },
            output: {
              expected: `The project that has the maximum avergae error rate is: 9d3031c7-4c66-4375-bd95-a4582c4345f3
The project had the maximum error rate of 0.278 on Oct 22, 2024`,
              query: `FROM error_rate_daily
| STATS avg_rate = AVG(error_rate) BY project_id
| SORT avg_rate DESC
| LIMIT 1
| KEEP project_id
\`\`\`

\`\`\`
FROM error_rate_daily
| WHERE project_id == "9d3031c7-4c66-4375-bd95-a4582c4345f3"
| SORT error_rate DESC
| LIMIT 1
| KEEP date, error_rate`,
            },
            metadata: {
              query_intent: 'Factual - Comparative',
            },
          },
          {
            input: {
              question:
                'What is the zendesk user id and last name of the user with highest project limit?',
            },
            output: {
              expected: `The zendesk_user_id is 41, last name is Diaz, max_project_limit is 932`,
              query: `FROM users
| WHERE max_project_limit IS NOT NULL
| SORT max_project_limit DESC
| LIMIT 1
| KEEP zendesk_user_id, last_name, max_project_limit`,
            },
            metadata: {
              query_intent: 'Factual',
            },
          },
          {
            input: { question: 'How many invoices were in paid vs pending status in 2024?' },
            output: {
              expected: `733 were paid and 94 were pending`,
              query: `FROM invoice
| WHERE year == 2024 AND status IN ("paid", "pending")
| STATS invoice_count = COUNT(stripe_invoice_id) BY status`,
            },
            metadata: {
              query_intent: 'Factual - Classification',
            },
          },
          {
            input: {
              question:
                'Today is Jul 8 2025. How many support tickets were created in the last 365 days and how many of those are still open',
            },
            output: {
              expected: `Total tickets created in last 365 days are 220 and out of those 76 are in open or pending status`,
              query: `FROM support_ticket
| WHERE created_at >= "2025-07-08" - 365 day
| STATS total_tickets = COUNT(id), open_tickets = COUNT(CASE(status IN ("open", "pending"), 1, NULL))`,
            },
            metadata: {
              query_intent: 'Factual - Classification',
            },
          },
          {
            input: {
              question:
                'Today is Jul 8 2025. What is the daily average of project creations in last 365 days?',
            },
            output: {
              expected: `2.021 projects/day`,
              query: `FROM projects
| WHERE created_at >= "2025-07-08" - 365 day
| STATS daily_count = COUNT(id) BY DATE_FORMAT("day", created_at)
| STATS avg_daily_creations = AVG(daily_count)`,
            },
            metadata: {
              query_intent: 'Factual - Temporal',
            },
          },
          {
            input: {
              question:
                'What are the number of active models and active commands of the project that had the longest lifetime?',
            },
            output: {
              expected: `id: 6138da66-1f68-4ff7-bb96-33af19a3a13e
active_models: 46
active_commands: 65`,
              query: `FROM projects
| WHERE deleted_at IS NOT NULL
| EVAL lifetime_in_seconds = DATE_DIFF("seconds", deleted_at, created_at)
| SORT lifetime_in_seconds DESC
| LIMIT 1
| KEEP id, active_models, active_commands`,
            },
            metadata: {
              query_intent: 'Factual',
              esql: `FROM projects
| WHERE deleted_at IS NOT NULL
| EVAL lifetime_in_seconds = DATE_DIFF("seconds", deleted_at, created_at)
| SORT lifetime_in_seconds DESC
| LIMIT 1
| KEEP id, active_models, active_commands`,
            },
          },
          {
            input: { question: 'Get top 5 customer ids with most requests' },
            output: {
              expected: `The top 5 customer id's with most requests are: 
cus_4a70ca84b46043ef, cus_40b3b3895a2d4eff, cus_a91d94735e5c4b72, cus_18e5efc0d5064430, cus_c373f2afc2c544ea`,
              query: `FROM requests_daily_count
| STATS total_requests = SUM(request_count) BY project_id
| SORT total_requests DESC
| LIMIT 5
| KEEP project_id
\`\`\`
\`\`\`
FROM projects
| WHERE id IN ("4e0f6be8-ed9f-468d-b087-22971343b4b9", "4cb97dba-f6f7-4db6-bf54-04ef5311e717", "3f5efc8b-ab63-42f8-adbc-970946e77d03", "afdd5609-733e-4c94-9eae-6861d8ec9ecf", "52ddcd47-053a-40ae-953f-c85db389d5eb")
| KEEP owner_id
\`\`\`
\`\`\`
FROM users
| WHERE id IN ("fd650d8f-b787-4d9c-a787-f25205bee7d3", "88ec5c03-3cd4-4b36-a5bc-2c0419cd0e72", "3d24de5a-7a44-45c9-9ed9-9c7b61176e3d", "17eacb47-cab4-4cb5-8d08-9a991067ccda", "83009c11-94c9-4d65-b15f-2be150ab558c")
| KEEP customer_id`,
            },
            metadata: {
              query_intent: 'Factual',
              esql: ``,
            },
          },
          {
            input: { question: 'How many projects did tina.jackson@gray-smith.com create' },
            output: {
              expected: `user id: eda2b9d8-caec-4913-85ac-953fff43a439
tina.jackson@gray-smith.com created 6 projects`,
              query: `FROM users
| WHERE email == "tina.jackson@gray-smith.com"
| KEEP id
\`\`\`
\`\`\`
FROM projects
| WHERE owner_id == "eda2b9d8-caec-4913-85ac-953fff43a439"
| STATS project_count = COUNT(id)`,
            },
            metadata: {
              query_intent: 'Factual',
            },
          },
          {
            input: {
              question:
                'How many open or pending tickets does each support agent currently have assigned to them?',
            },
            output: {
              expected: `Agent, ticket_count
1454,7
1754,11
605613
7774,18
7840,12
7913,8
7955,12
8315,10
8907,11
9554,11
no agent id, 7`,
              query: `FROM support_ticket
| WHERE status IN ("open", "pending")
| STATS ticket_count = COUNT(id) BY assignee_id
| SORT assignee_id`,
            },
            metadata: {
              query_intent: 'Factual - Classification',
            },
          },
          {
            input: {
              question:
                'Today is Oct 31 2024. How many new projects were created this month compared to last month?',
            },
            output: {
              expected: `Month, projects_created`,
              query: `FROM projects
| WHERE created_at >= "2024-10-31" - 2 month
| STATS monthly_project_creations = COUNT(id) BY DATE_EXTRACT("month_of_year", created_at)`,
            },
            metadata: {
              query_intent: 'Factual - Comparative',
            },
          },
          {
            input: {
              question:
                'Today is Jul 8 2025. Which 10 projects generated the most revenue last 10 months?',
            },
            output: {
              expected: `project_id, total_revenue
2aa0cdeb-9865-4281-a783-fbfa8c6731f1, 5790
5389ca1d-543d-4d99-918e-b94fd7ea8f32, 5580
1e4ed485-c24c-411a-a32f-f8122befb9fe, 5250
be9884e1-8fad-4d40-be52-2abd8ccd746c, 5130
a34450d4-2101-4f9a-b22d-b46e6e27934c, 5070
9c562378-3f3b-456d-b396-1a7f7eaa23c7, 5040
f81c5db1-c3eb-4c03-956c-807b8de11c73, 4980        
58e1cce5-ef49-4dd5-8182-25f46020e687, 4920
126a64b3-cc8a-4a42-af3f-46e911e24bdf, 4920
c06a4866-f097-4eed-b7ca-28d60c9ba864, 4890`,
              query: `FROM invoice_item
| WHERE created_at >= "2025-07-08" - 10 month
| STATS total_revenue = SUM(amount) BY project_id
| SORT total_revenue DESC
| LIMIT 10`,
            },
            metadata: {
              query_intent: 'Factual - Temporal',
            },
          },
          {
            input: {
              question:
                'Toady is Jan 1 2025. Between support agents with ids 1454 and 6056, which one has a higher ticket closure rate for high or urgent priority issues in last 180 days?',
            },
            output: {
              expected: `assignee_id, total_tickets, closed_tickets, closure_rate
6056,12,7,58.33
1454,3,1,33.33`,
              query: `FROM support_ticket
| WHERE created_at >= "2025-01-01" - 180 day and assignee_id IN (1454, 6056) AND priority IN ("high", "urgent")
| STATS total_tickets = COUNT(id), closed_tickets = COUNT(CASE(status == "closed", 1, NULL)) BY assignee_id
| EVAL closure_rate = closed_tickets * 100.0 / total_tickets
| SORT closure_rate DESC`,
            },
            metadata: {
              query_intent: 'Factual - Comparative',
            },
          },
        ],
      },
    });
  });
});
