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
   * The maximum LIMIT to use when the user asks for "all" results.
   */
  maxAllLimit?: number;
}

const DEFAULT_LIMIT = 100;
const MAX_ALL_LIMIT = 250;

/**
 * Generates ES|QL query generation instructions with configurable limit values.
 * This is a copy of the instructions from the inference plugin, modified to support
 * custom row limits for Agent Builder's index search tool.
 */
export const getEsqlInstructions = (params: InstructionsTemplateParams = {}): string => {
  const { defaultLimit = DEFAULT_LIMIT, maxAllLimit = MAX_ALL_LIMIT } = params;

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

    1. **LIMIT is Mandatory:** All multi-row queries **must** end with a \`LIMIT\`. The only exception is for single-row aggregations (e.g., \`STATS\` without a \`GROUP BY\`).

    2. **Applying Limits:**
        * **User-Specified:** If the user provides a number ("top 10", "get 50"), use it for the \`LIMIT\`.
        * **Default:** If no number is given, default to \`LIMIT ${defaultLimit}\` for both raw events and \`GROUP BY\` results. Notify the user when you apply this default (e.g., "I've added a \`LIMIT ${defaultLimit}\` for safety.").

    3. **Handling "All Data" Requests:** If a user asks for "all" results, apply a safety \`LIMIT ${maxAllLimit}\` and state that this limit was added to protect the system.

    ## Don't use tech preview features unless specified otherwise

    Using tech preview commands, functions or other features should be avoided unless specifically asked by the user.

    ## Use MATCH for full text search

    Unless specified otherwise, full text searches should always be done using MATCH in favor of other search functions.

    ## ES|QL query formatting

    - All generated ES|QL queries must be wrapped with \`\`\`esql and \`\`\`
    - Queries must be properly formatted, with a carriage return after each function

    Example:
    \`\`\`
    FROM logs-*
    | WHERE @timestamp <= NOW() - 24 hours
    | STATS count = COUNT(*) BY log.level
    | SORT count DESC
    \`\`\`

    ## Do not invent things to please the user

    If what the user is asking for is not technically achievable with ES|QL's capabilities, just inform
    the user. DO NOT invent capabilities not described in the documentation just to provide
    a positive answer to the user.

    When converting queries from one language to ES|QL, make sure that the functions are available
    and documented in ES|QL. E.g., for SPL's LEN, use LENGTH. For IF, use CASE.

    ## Tool Usage Restrictions

    **CRITICAL**: Only use the tools that are explicitly defined in your available tool set. Do not call
    tools from other contexts or systems.

</instructions>
`;
};
