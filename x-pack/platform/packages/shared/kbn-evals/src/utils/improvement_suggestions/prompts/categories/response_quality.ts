/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

/**
 * Category-specific sub-prompt for analyzing response quality issues.
 * Provides specialized guidance for identifying and improving the quality,
 * clarity, and format of AI responses.
 */
export const RESPONSE_QUALITY_CATEGORY_PROMPT = dedent`
## Response Quality Category Analysis

When analyzing **response_quality**-related issues, focus on:

### Common Response Quality Issues

1. **Format Compliance**
   - Not following requested output format (JSON, markdown, etc.)
   - Inconsistent formatting across responses
   - Missing required fields or sections
   - Extra content outside expected format

2. **Completeness**
   - Partial answers that don't fully address the query
   - Missing important details or caveats
   - Truncated responses
   - Skipping parts of multi-part questions

3. **Clarity and Coherence**
   - Confusing or unclear explanations
   - Poor organization of information
   - Jumping between topics without transitions
   - Using jargon without explanation

4. **Verbosity Issues**
   - Excessively long responses when brevity is needed
   - Too brief when detail is requested
   - Unnecessary repetition
   - Filler content without substance

5. **Tone and Style**
   - Inappropriate tone for the context
   - Inconsistent voice or style
   - Missing requested persona characteristics
   - Overly casual or formal for the use case

6. **Actionability**
   - Vague recommendations without specifics
   - Missing next steps or concrete actions
   - Theoretical answers when practical ones are needed

### Evidence Patterns to Look For

- Schema compliance failures in structured output evaluators
- Low scores on response quality or helpfulness metrics
- Format validation errors
- User feedback indicating confusion or incompleteness
- Length distributions outside expected ranges
- Tone/style mismatches flagged by evaluators

### Recommendation Framework

When suggesting response quality improvements:
- Provide specific format templates or examples
- Suggest output validation steps
- Recommend length constraints or guidelines
- Propose structured response formats
- Consider adding quality checkpoints in prompts
- Evaluate if response structure should be more explicit
`;

/**
 * Returns specialized analysis guidance for response quality issues.
 */
export function getResponseQualityCategoryGuidance(): string {
  return RESPONSE_QUALITY_CATEGORY_PROMPT;
}
