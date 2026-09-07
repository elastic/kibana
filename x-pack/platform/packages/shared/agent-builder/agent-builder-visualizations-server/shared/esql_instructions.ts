/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Bind the source command to the index the caller grounded the request against.
 *
 * Naming the index literally rather than pointing at the prompt's resource block keeps this
 * guidance independent of how the ES|QL generator formats its prompt. Omitted when the
 * caller passed no index, because the target is then auto-discovered downstream and this
 * layer has no name to pin the query to.
 */
const buildTargetIndexGuidance = (index: string) => `
## Read from the requested index

The query **MUST** read from \`${index}\`. Use that name verbatim in the source command (\`FROM\` or \`TS\`), including any wildcards and any \`cluster:\` remote prefix.
Do **NOT** substitute a pattern inferred from the request, from the field names, or from your own knowledge of common Elasticsearch schemas, even when it looks more specific or more idiomatic — a chart built on a pattern that matches no index silently renders empty.
To restrict which documents are returned, add a \`WHERE\` clause; never narrow by changing the source.
`;

/**
 * ES|QL authoring guidance shared by both the Lens and Vega engines. It is
 * appended to the ES|QL generation prompt so generated queries are
 * visualization-ready (readable aliases, time-picker compatible, properly
 * bucketed) regardless of which renderer ultimately consumes the result.
 */
export const buildEsqlAdditionalInstructions = (index?: string): string => `
You are generating an ES|QL query for a Kibana visualization. The query will be used to create a visualization in Kibana.

For that purpose, follow these guidelines:
${index ? buildTargetIndexGuidance(index) : ''}
## Human-readable column aliases

Use human-readable column aliases in STATS/EVAL (e.g. \`Unique Visitors\` not \`unique_visitors\`). Wrap multi-word aliases in backticks.

## Time picker compatibility

Visualization ES|QL must respond to the Lens time picker. If a time field exists, use the event-time field, typically \`@timestamp\`, \`timestamp\`, or another event date. Reference \`?_tstart\` and \`?_tend\` in the query.
For time-series charts, pass \`?_tstart\` and \`?_tend\` to the bucket function.
For categorical, metric, or any other charts that do not group by time, add a filter such as \`WHERE <time field> >= ?_tstart AND <time field> < ?_tend\`.
Do not hardcode absolute times or now()-based ranges.

## Time Bucketing

### FROM

For time series charts, use auto buckets: \`BUCKET(<time field>, 75, ?_tstart, ?_tend)\` or \`TBUCKET(75, ?_tstart, ?_tend)\`, not hardcoded intervals like \`DATE_TRUNC(1 hour, <time field>)\`.
Omit \`LIMIT\`; the bucket range already bounds the results.

e.g. for a normal index with FROM and BUCKET:

\`\`\`esql
FROM logs | STATS count = COUNT() BY bucket = BUCKET(timestamp, 75, ?_tstart, ?_tend)
\`\`\`

### TS

The visualization framework automatically adds the correct time range to the query for time series when using TS,
meaning you **do not need** to filter using TRANGE manually.

The only exception when you should use the variables to manually filter the timeframe with TS is for TBUCKET,

e.g.

\`\`\`esql
TS logs-tsds | STATS count = COUNT() BY bucket = TBUCKET(75, ?_tstart, ?_tend)
\`\`\`

Also omit \`LIMIT\` (same reasons as with FROM).`;
