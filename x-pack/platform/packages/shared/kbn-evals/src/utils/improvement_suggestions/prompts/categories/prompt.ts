/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

/**
 * Category-specific sub-prompt for analyzing prompt-related issues.
 * Provides specialized guidance for identifying and improving system prompts,
 * instructions, and context provided to the AI.
 */
export const PROMPT_CATEGORY_PROMPT = dedent`
## Prompt Category Analysis

When analyzing **prompt**-related issues, focus on:

### Common Prompt Issues

1. **Ambiguous Instructions**
   - Instructions that can be interpreted multiple ways
   - Missing specificity about expected output format
   - Unclear boundaries or constraints

2. **Missing Context**
   - Essential background information not provided
   - Assumed knowledge that the model doesn't have
   - Domain-specific terminology without definitions

3. **Conflicting Directives**
   - Contradictory instructions within the prompt
   - Inconsistent formatting requirements
   - Mixed signals about priorities

4. **Prompt Structure Problems**
   - Information overload in a single prompt
   - Poor organization making key details hard to find
   - Missing examples or few-shot demonstrations

5. **Role/Persona Issues**
   - Unclear or inappropriate role definition
   - Misalignment between role and task requirements
   - Missing behavioral guidelines

### Evidence Patterns to Look For

- Low scores on instruction-following evaluators
- Inconsistent output formats across examples
- Model asking clarifying questions (if conversational)
- Outputs that partially address the prompt
- Hallucinations that could stem from unclear context

### Recommendation Framework

When suggesting prompt improvements:
- Propose specific wording changes with before/after examples
- Suggest structural reorganization if applicable
- Recommend adding examples or clarifying constraints
- Consider whether the prompt should be split into multiple turns
- Evaluate if system vs user prompt split is optimal
`;

/**
 * Returns specialized analysis guidance for prompt-related issues.
 */
export function getPromptCategoryGuidance(): string {
  return PROMPT_CATEGORY_PROMPT;
}
