/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

/**
 * Category-specific sub-prompt for analyzing accuracy issues.
 * Provides specialized guidance for identifying and correcting factual
 * errors and incorrect information in AI responses.
 */
export const ACCURACY_CATEGORY_PROMPT = dedent`
## Accuracy Category Analysis

When analyzing **accuracy**-related issues, focus on:

### Common Accuracy Issues

1. **Factual Errors**
   - Incorrect dates, numbers, or statistics
   - Wrong names, places, or attributions
   - Outdated information presented as current
   - Fabricated facts or "hallucinations"

2. **Technical Inaccuracies**
   - Incorrect API or function signatures
   - Wrong syntax for programming languages
   - Misattributed features to software versions
   - Incorrect technical specifications

3. **Domain Knowledge Errors**
   - Misunderstanding domain-specific concepts
   - Incorrect terminology usage
   - Wrong relationships between domain entities
   - Misapplying domain rules or conventions

4. **Numerical Accuracy**
   - Calculation errors in presented numbers
   - Rounding or precision issues
   - Unit mismatches
   - Statistical misrepresentations

5. **Temporal Accuracy**
   - Confusing past and present information
   - Not accounting for version differences
   - Using deprecated information
   - Missing time-sensitive context

6. **Source Accuracy**
   - Misquoting sources
   - Incorrect paraphrasing
   - Fabricating citations
   - Misattributing statements

### Evidence Patterns to Look For

- Correctness evaluator failures
- Factual verification check failures
- Specific error annotations from evaluators
- Groundedness issues (claims not supported by context)
- Consistency failures across similar queries
- Known incorrect outputs flagged in examples

### Recommendation Framework

When suggesting accuracy improvements:
- Identify specific factual claims that failed
- Propose grounding requirements for claims
- Suggest verification tool integration
- Recommend knowledge base updates
- Consider confidence calibration
- Propose fact-checking workflows
- Evaluate if retrieval could supplement model knowledge
`;

/**
 * Returns specialized analysis guidance for accuracy issues.
 */
export function getAccuracyCategoryGuidance(): string {
  return ACCURACY_CATEGORY_PROMPT;
}
