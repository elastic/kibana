/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

/**
 * Category-specific sub-prompt for analyzing issues that don't fit other categories.
 * Provides guidance for handling edge cases and cross-cutting concerns.
 */
export const OTHER_CATEGORY_PROMPT = dedent`
## Other Category Analysis

When analyzing issues that don't fit neatly into other categories, consider:

### Cross-Cutting Concerns

1. **System Integration Issues**
   - Problems at the boundaries between components
   - API contract mismatches
   - Authentication or authorization issues
   - Network or connectivity problems

2. **Data Quality Issues**
   - Problems with input data format or quality
   - Missing or malformed expected inputs
   - Encoding or character set issues
   - Data validation failures

3. **Configuration Problems**
   - Misconfigured parameters or settings
   - Environment-specific issues
   - Version mismatches
   - Feature flag inconsistencies

4. **Edge Cases and Boundary Conditions**
   - Unusual input patterns not covered elsewhere
   - Rare but impactful failure modes
   - Corner cases in business logic
   - Unexpected user behavior patterns

5. **Multi-System Interactions**
   - Timing or race conditions
   - Cascading failures across systems
   - State synchronization issues
   - Distributed system coordination problems

6. **Observability and Debugging**
   - Insufficient logging or tracing
   - Missing error context
   - Hard-to-diagnose failures
   - Lack of actionable error messages

### When to Use This Category

Use the "other" category when:
- The issue spans multiple categories
- The issue is truly unique and doesn't fit patterns
- The issue relates to infrastructure rather than AI behavior
- The issue is about tooling, monitoring, or operations
- The root cause is external to the AI system

### Evidence Patterns to Look For

- Errors without clear categorization
- System-level failures vs. model-level issues
- Environmental or configuration-related patterns
- Issues appearing only under specific conditions
- Cross-component failure chains

### Recommendation Framework

When suggesting improvements for "other" issues:
- Clearly explain why other categories don't fit
- Identify if this reveals a gap in the category taxonomy
- Propose specific, actionable remediation
- Consider if this should inform new category definitions
- Document patterns for future reference
`;

/**
 * Returns specialized analysis guidance for other/miscellaneous issues.
 */
export function getOtherCategoryGuidance(): string {
  return OTHER_CATEGORY_PROMPT;
}
