/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

/**
 * Category-specific sub-prompt for analyzing tool selection issues.
 * Provides specialized guidance for identifying and improving tool/function
 * calling behavior in AI systems.
 */
export const TOOL_SELECTION_CATEGORY_PROMPT = dedent`
## Tool Selection Category Analysis

When analyzing **tool_selection**-related issues, focus on:

### Common Tool Selection Issues

1. **Wrong Tool Selection**
   - Choosing a suboptimal tool when a better one exists
   - Using generic tools instead of specialized ones
   - Misunderstanding tool capabilities or scope

2. **Missing Tool Calls**
   - Failing to use available tools when appropriate
   - Attempting to answer without required data retrieval
   - Skipping necessary validation or verification tools

3. **Unnecessary Tool Calls**
   - Calling tools when the answer is already available
   - Redundant calls to the same tool
   - Over-reliance on tools for simple computations

4. **Incorrect Tool Parameters**
   - Wrong parameter types or formats
   - Missing required parameters
   - Invalid parameter values or ranges
   - Malformed JSON in structured parameters

5. **Tool Sequencing Problems**
   - Calling tools in suboptimal order
   - Missing prerequisite tool calls
   - Not using output from one tool as input to another

6. **Tool Result Handling**
   - Ignoring tool results in final response
   - Misinterpreting tool output format
   - Not handling tool errors appropriately

### Evidence Patterns to Look For

- Tool selection evaluator flagging incorrect choices
- High latency due to unnecessary tool chains
- Errors in tool call execution
- Mismatch between available tools and tools actually used
- Tool calls with invalid or malformed parameters
- Results not incorporated into final answers

### Recommendation Framework

When suggesting tool selection improvements:
- Analyze the tool definitions for clarity and overlap
- Suggest tool description improvements
- Recommend parameter schema refinements
- Consider adding tool usage examples in prompts
- Evaluate if tool boundaries are well-defined
- Propose tool routing or disambiguation strategies
`;

/**
 * Returns specialized analysis guidance for tool selection issues.
 */
export function getToolSelectionCategoryGuidance(): string {
  return TOOL_SELECTION_CATEGORY_PROMPT;
}
