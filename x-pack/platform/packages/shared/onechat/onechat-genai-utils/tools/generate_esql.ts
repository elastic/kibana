/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, toArray, firstValueFrom } from 'rxjs';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { isChatCompletionMessageEvent, isChatCompletionEvent } from '@kbn/inference-common';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import type { ScopedModel } from '@kbn/onechat-server';
import { indexExplorer } from './index_explorer';
import { extractEsqlQueries } from './utils/esql';
import {
  resolveResourceWithSamplingStats,
  formatResourceWithSampledValues,
} from './utils/resources';

export interface GenerateEsqlResponse {
  answer: string;
  queries: string[];
}

export const generateEsql = async ({
  nlQuery,
  index,
  context,
  model,
  esClient,
}: {
  nlQuery: string;
  context?: string;
  index?: string;
  model: ScopedModel;
  esClient: ElasticsearchClient;
}): Promise<GenerateEsqlResponse> => {
  let selectedTarget = index;

  if (!selectedTarget) {
    const {
      resources: [selectedResource],
    } = await indexExplorer({
      nlQuery,
      esClient,
      limit: 1,
      model,
    });
    selectedTarget = selectedResource.name;
  }

  const resolvedResource = await resolveResourceWithSamplingStats({
    resourceName: selectedTarget,
    samplingSize: 100,
    esClient,
  });

  const esqlEvents$ = naturalLanguageToEsql({
    // @ts-expect-error using a scoped inference client
    connectorId: undefined,
    client: model.inferenceClient,
    logger: { debug: () => undefined },
    input: `Your task is to write a single, valid ES|QL query based on the provided information.

<user_query>
${nlQuery}
</user_query>

<context>
${context ?? 'No additional context provided.'}
</context>

${formatResourceWithSampledValues({ resource: resolvedResource, indentLevel: 0 })}

<directives>
## Safety LIMIT

### 1. The Golden Rule: Always Limit Final Output

Your primary directive is **Query Safety**. Every ES|QL query you generate that returns multiple rows **must** conclude with a LIMIT clause.
The only exception is for aggregation queries that are guaranteed to return a single row (e.g., STATS without a GROUP BY).

### 2. Retrieving Raw Events (Default Behavior)

This applies when the query's primary purpose is to return a list of individual documents or events.

* **Default Limit:** If the user's request does not specify a number of results (e.g., "show me errors"), you **must** append a default safety limit of LIMIT 100.
* **User-Specified Limit:** If the user *does* specify a number (e.g., "get me 20 logs"), use their number in the LIMIT clause.
* **Notification:** When applying the default limit, always inform the user. (e.g., "I've added a LIMIT 100 to the query for performance.")

### 3. Working with Aggregated Data (GROUP BY)

This applies when using GROUP BY to categorize and count results. The LIMIT here controls the number of *groups* returned.

* **Default Aggregation Limit:** If the user asks for grouped results without specifying a quantity (e.g., "what are the top source IPs?", "count events by hostname"), you **must** default to returning the top 100 groups by appending LIMIT 100.
* **User-Specified Aggregation Limit:** If the user asks for a specific number of groups (e.g., "top 5 users," "bottom 20 hosts"), use their number in the LIMIT clause.
* **Single-Row Aggregations:** If a query uses an aggregation like STATS but has **no GROUP BY clause**, it will only return a single row. In this case, a LIMIT clause is unnecessary and **should not** be added.

### 4. Handle "All Data" Requests Safely

This rule applies to all query types. If the user asks for "all data," "every group," or implies an unbounded result set, you **must not** generate a query without a LIMIT. Instead, use a safety limit of 1000, and inform the user about it and the reasons

## Examples in Action

### Scenario 1: Raw Events (User is vague)
* **User Prompt:** "Find authentication failures."
* **Agent's Response:** > I've added a \`LIMIT 100\` to the query to ensure performance. You can ask for more if you need.

\`\`\`esql
FROM my-auth-logs-*
| WHERE auth.result == "failure"
| LIMIT 100
\`\`\`
</directives>

Based on all the information above, generate the ES|QL query.
`,
  });

  const messages = await firstValueFrom(
    esqlEvents$.pipe(filter(isChatCompletionEvent), filter(isChatCompletionMessageEvent), toArray())
  );

  const fullContent = messages.map((message) => message.content).join('\n');
  const esqlQueries = extractEsqlQueries(fullContent);

  return {
    answer: fullContent,
    queries: esqlQueries,
  };
};
