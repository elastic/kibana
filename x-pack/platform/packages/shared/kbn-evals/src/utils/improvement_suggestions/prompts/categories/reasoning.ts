/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

/**
 * Category-specific sub-prompt for analyzing reasoning issues.
 * Provides specialized guidance for identifying and improving logical
 * reasoning, analysis, and problem-solving in AI systems.
 */
export const REASONING_CATEGORY_PROMPT = dedent`
## Reasoning Category Analysis

When analyzing **reasoning**-related issues, focus on:

### Common Reasoning Issues

1. **Logical Fallacies**
   - Non-sequitur conclusions
   - Circular reasoning
   - False dichotomies
   - Hasty generalizations
   - Appeal to authority without evidence

2. **Chain-of-Thought Problems**
   - Skipping important reasoning steps
   - Incorrect intermediate conclusions
   - Not showing work when required
   - Jumping to conclusions without justification

3. **Mathematical/Analytical Errors**
   - Calculation mistakes
   - Unit conversion errors
   - Statistical misinterpretations
   - Incorrect formula application

4. **Causal Reasoning Issues**
   - Confusing correlation with causation
   - Missing confounding variables
   - Incorrect causal direction
   - Oversimplifying complex relationships

5. **Conditional Reasoning**
   - Mishandling edge cases
   - Incorrect if-then logic
   - Not considering all conditions
   - Boolean logic errors

6. **Abstraction Problems**
   - Over-generalizing from specific cases
   - Under-generalizing when patterns exist
   - Missing analogies that would help
   - Incorrect pattern matching

### Evidence Patterns to Look For

- Low scores on reasoning or correctness evaluators
- Errors in step-by-step explanations
- Inconsistent conclusions from same premises
- Mathematical verification failures
- Logic chain breaks in traces
- Self-contradiction within responses

### Recommendation Framework

When suggesting reasoning improvements:
- Propose chain-of-thought prompting strategies
- Suggest decomposition of complex problems
- Recommend verification steps (self-check)
- Consider adding worked examples
- Evaluate if reasoning should be explicit vs. implicit
- Propose structured reasoning frameworks
- Suggest mathematical verification tools
`;

/**
 * Returns specialized analysis guidance for reasoning issues.
 */
export function getReasoningCategoryGuidance(): string {
  return REASONING_CATEGORY_PROMPT;
}
