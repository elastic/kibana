/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface InstructionsTemplateParams {
  /**
   * The default LIMIT to use when no specific limit is requested by the user.
   */
  defaultLimit?: number;
  /**
   * If true, omits the instruction to use named parameters (?_tstart, ?_tend)
   * for time range filtering.
   */
  disableNamedParams?: boolean;
}

const DEFAULT_LIMIT = 100;

/**
 * Generates ES|QL query generation instructions with configurable limit values.
 * This is a copy of the instructions from the inference plugin, modified to support
 * custom row limits for Agent Builder's index search tool.
 */
export const getEsqlInstructions = (params: InstructionsTemplateParams = {}): string => {
  const { defaultLimit = DEFAULT_LIMIT, disableNamedParams = false } = params;

  return `<instructions>

    ## Follow the syntax

    It is CRUCIAL and MANDATORY to only use commands and functions which are present in the syntax definition,
    and to follow the syntax as described in the documentation and its examples. Do not try to guess
    new functions or commands based on other query languages. Assume that ONLY the set of capabilities described
    in the provided ES|QL documentation is valid, and do not try to guess parameters or syntax based
    on other query languages.

    ## Respect the mappings or field definitions

    If the user, or a tool, provides in the discussion the mappings or a list of fields present in the index, you should **ONLY** use
    the provided fields to create your query. Do not assume other fields may exist. Only use the set of fields
    which were provided by the user.

    ## Preserve every constraint of the request

    The query must implement each constraint the request states, and add nothing the request does not imply.

    - **Match stated values with equality.** When a specific value is given for an identifier-like field
      (\`process.name\`, \`event.action\`, \`event.category\`, \`destination.port\`, \`url.domain\`, \`user.name\`, ...)
      compare it with \`==\`, or with \`IN (...)\` for a list of values. Do not replace an exact value with
      \`LIKE\`, \`RLIKE\`, \`MATCH\`, \`MATCH_PHRASE\`, \`QSTR\` or \`CONTAINS\`: those widen the match to substrings,
      tokens or regular expressions and change which documents come back. Reserve them for requests that
      really do ask for a partial, fuzzy or full-text match.
    - **Keep every grouping dimension.** \`STATS ... BY\` must group by each dimension the request asks to break
      the result down by — drop none of them, invent none of them.
    - **Keep every filter and threshold as an explicit condition.** If the request names a bound, a size, a
      count or a comparison (\`> 1000000\`, \`fewer than 5\`, \`non-standard\`), express it as a comparison instead
      of dropping it, and keep qualifiers such as "outbound" or "external" as their own condition. When the
      threshold applies to an aggregated value, the comparison belongs **after** the \`STATS\` command, because
      \`WHERE\` cannot reference an aggregate column:
      \`... | STATS data_size = SUM(network.bytes) BY destination.ip | WHERE data_size > 1000000\`.
    - **Do not drop or rewrite a constraint** because the sampled documents suggest something else: the
      request defines the target, the samples only show what the data looks like.

    ## Keep the source the user named

    When the user names an index, index pattern, data view or alias (\`logs-*\`, \`metrics-apm-*\`, \`employees-*\`, ...),
    use that exact expression in the source command. Do not replace it with a single backing index, a concrete
    date-stamped index, or any other narrower name found while exploring: a narrower source silently reports only
    part of the data the user asked about. Only choose a discovered index or data view when the user did not name
    a source at all. Never write an index name that the environment has just shown not to exist — if the
    requested pattern resolves to nothing, say so instead of guessing a name.

    ## Use a safety LIMIT

    Adding a \`LIMIT\` is generally good practice: it keeps result sets bounded and protects the
    caller from oversized responses. Apply the following defaults, but let the user's natural-language
    query or any custom instructions override them.

    1. **Applying Limits:**
        * **User-Specified:** If the user provides a number ("top 10", "get 50"), use it for the \`LIMIT\`.
        * **Default:** If no number is given, default to \`LIMIT ${defaultLimit}\` for both raw events and \`GROUP BY\` results.

    2. **Time-series aggregations:** Queries that bucket by time (e.g. \`STATS ... BY BUCKET(@timestamp, ...)\`)
       should **not** have a \`LIMIT\` by default — a trailing \`LIMIT\` truncates the series and
       produces a partial time line. The \`?_tstart\`/\`?_tend\` range already bounds the result.
       Only add a \`LIMIT\` here if the user's query explicitly asks for one.

    3. **Single-row aggregations:** Queries using \`STATS\` without a \`GROUP BY\` return a single row and do not need a \`LIMIT\`.

    4. **Opting out:** If the user's query or the custom instructions explicitly ask for no limit
       (e.g. "return every row", "don't cap the results", "return all data"), omit \`LIMIT\` entirely.
       Do the same when the caller's instructions indicate the query will be consumed by a system
       that handles sizing itself (visualizations, exports, downstream aggregations).

    ## Don't use tech preview features unless specified otherwise

    Using tech preview commands, functions or other features should be avoided unless specifically asked by the user.

    ## Use MATCH for full text search

    Unless specified otherwise, full text searches should always be done using MATCH in favor of other search functions.

    ## Use TS instead of FROM for time series

    When the resource supports it (\`is-tsds\` is true) use the \`TS\` source command instead of \`FROM\` for time series data streams (TSDS) indices.
    This ensures that time series aggregations are performed correctly and efficiently, and allows using time-serie specific functions such as TBUCKET or RATE.

    The only reasons to **not** use \`TS\` for time series are:
    - request is about returning raw documents (no aggregations / STATS commands)
    - user explicitly asked to use FROM
    - user asked for PromQL or provided a PromQL expression, in which case use \`PROMQL\`

    ## ES|QL query formatting

    - All generated ES|QL queries must be wrapped with \`\`\`esql and \`\`\`
    - Queries must be properly formatted, with a carriage return after each function

    Example:
    \`\`\`esql
    FROM logs-*
    | STATS count = COUNT(*) BY log.level
    | SORT count DESC
    \`\`\`

    ${
      disableNamedParams
        ? ''
        : `## Using named parameters for start and end time periods

    Unless specified otherwise, you should always use named parameters (?_tstart and ?_tend) for start and end time in WHERE conditions, BUCKET ranges, TRANGE or the PROMQL start, end and time options,
    examples:
    - "FROM myindex | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend"
    - "FROM myindex | ... BUCKET(@timestamp, 50, ?_tstart, ?_tend)"
    - "TS mytsds | WHERE TRANGE(?_tstart, ?_tend)"
    - "PROMQL index=mytsds start=?_tstart end=?_tend request_rate=(sum by (host) (rate(requests)))"
    - "PROMQL index=mytsds time=?_tend request_rate=(sum by (host) (rate(requests)))"

    The query runs with these parameters rather than with Kibana's date picker, so for PROMQL range queries set the start and end options to them, even though the PROMQL documentation recommends omitting them in Kibana. Instant queries use time=?_tend instead, since time can't be combined with start and end.

    NEVER hardcode time ranges into the query itself (absolute or using now() syntax)

    It is also preferred to use  "... BUCKET(@timestamp, 50, ?_tstart, ?_tend)" instead of " ... WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend ... BUCKET(@timestamp, 50)"

    `
    }## State the limitations of ES|QL instead of inventing syntax

    When a request cannot be satisfied with ES|QL, say so and offer the closest supported form. In particular:

    - **Pagination is not supported.** There is no \`OFFSET\`, no page parameter and no \`LIMIT ... OFFSET ...\`;
      \`LIMIT\` returns the first n rows only. For "page 2" or "results 10 to 20", state that pagination is not
      supported and offer a supported equivalent: a \`SORT\` whose order the caller can page through client-side,
      a narrower filter, or a larger \`LIMIT\`.
    - **Window functions do not exist.** \`ROW_NUMBER\`, \`RANK\`, \`LAG\` and \`LEAD\` are not ES|QL functions.
      Compute per-group values with \`STATS ... BY\` instead.

    ## Do not invent things to please the user

    If what the user is asking for is not technically achievable with ES|QL's capabilities, just inform
    the user. DO NOT invent capabilities not described in the documentation just to provide
    a positive answer to the user.
</instructions>
`;
};
