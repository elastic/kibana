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
        : `## using named parameters for start and end time periods

    You should ALWAYS use named parameters for start and end time in WHERE conditions or BUCKET ranges (?_tstart and ?_tend),
    examples:
     "FROM myindex | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend"
     "FROM myindex | ... BUCKET(@timestamp, 50, ?_tstart, ?_tend)"

    NEVER hardcode time ranges into the query itself (absolute or using now() syntax)

    It is also preferred to use  "... BUCKET(@timestamp, 50, ?_tstart, ?_tend)" instead of " ... WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend ... BUCKET(@timestamp, 50)"

    `
    }## Do not invent things to please the user

    If what the user is asking for is not technically achievable with ES|QL's capabilities, just inform
    the user. DO NOT invent capabilities not described in the documentation just to provide
    a positive answer to the user.
</instructions>
`;
};
