/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

/**
 * Category-specific sub-prompt for analyzing efficiency issues.
 * Provides specialized guidance for identifying and improving performance,
 * speed, and resource usage in AI systems.
 */
export const EFFICIENCY_CATEGORY_PROMPT = dedent`
## Efficiency Category Analysis

When analyzing **efficiency**-related issues, focus on:

### Common Efficiency Issues

1. **Token Usage**
   - Excessive prompt tokens
   - Verbose responses consuming unnecessary tokens
   - Redundant information in prompts
   - Not leveraging prompt caching effectively

2. **Latency Problems**
   - Slow response times for simple queries
   - Unnecessary sequential processing
   - Blocking on slow external calls
   - Not parallelizing independent operations

3. **Tool Call Efficiency**
   - Redundant tool calls
   - Not batching tool calls when possible
   - Unnecessary tool chain depth
   - Calling tools for information already available

4. **Context Efficiency**
   - Including unnecessary context
   - Not truncating or summarizing long contexts
   - Poor context prioritization
   - Repeated context across conversation turns

5. **Model Selection**
   - Using large models for simple tasks
   - Not routing to appropriate model sizes
   - Missing opportunities for model cascading
   - Not caching model responses when appropriate

6. **Resource Waste**
   - Unnecessary retries
   - Redundant processing
   - Not reusing computed results
   - Inefficient data transformations

### Evidence Patterns to Look For

- High token counts relative to task complexity
- Latency outliers in trace data
- Repeated tool calls to same endpoints
- Large context sizes with low utilization
- Multiple LLM calls where one would suffice
- Trace-based metrics showing inefficiency

### Recommendation Framework

When suggesting efficiency improvements:
- Quantify the efficiency impact (tokens, latency, cost)
- Propose prompt compression strategies
- Suggest caching opportunities
- Recommend parallelization where applicable
- Consider model routing or cascading
- Evaluate batch processing opportunities
- Propose response length guidelines
- Suggest tool call optimization strategies
`;

/**
 * Returns specialized analysis guidance for efficiency issues.
 */
export function getEfficiencyCategoryGuidance(): string {
  return EFFICIENCY_CATEGORY_PROMPT;
}
