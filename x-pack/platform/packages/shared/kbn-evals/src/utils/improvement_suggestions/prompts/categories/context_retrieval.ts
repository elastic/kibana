/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

/**
 * Category-specific sub-prompt for analyzing context retrieval issues.
 * Provides specialized guidance for identifying and improving RAG (Retrieval
 * Augmented Generation) and context handling in AI systems.
 */
export const CONTEXT_RETRIEVAL_CATEGORY_PROMPT = dedent`
## Context Retrieval Category Analysis

When analyzing **context_retrieval**-related issues, focus on:

### Common Context Retrieval Issues

1. **Retrieval Quality Problems**
   - Retrieved documents not relevant to the query
   - Missing key information that exists in the knowledge base
   - Retrieving outdated or deprecated information
   - Low precision in retrieved results

2. **Context Utilization**
   - Retrieved context not being used in the response
   - Cherry-picking from context while ignoring relevant parts
   - Misinterpreting or misquoting retrieved information
   - Over-reliance on context vs. model knowledge

3. **Query Formulation**
   - Poorly constructed retrieval queries
   - Missing key terms or concepts in queries
   - Overly broad or narrow query scope
   - Not decomposing complex queries

4. **Context Window Issues**
   - Exceeding context window limits
   - Important information being truncated
   - Poor prioritization of context ordering
   - Not summarizing long documents appropriately

5. **Source Attribution**
   - Missing citations or references
   - Incorrect source attribution
   - Not distinguishing between sources
   - Fabricating sources not in retrieved context

6. **Multi-hop Retrieval**
   - Failing to follow chains of information
   - Not combining information from multiple sources
   - Missing intermediate retrieval steps
   - Not resolving references across documents

### Evidence Patterns to Look For

- RAG evaluator scores (precision, recall, F1)
- Context relevance metrics
- Groundedness scores indicating unsupported claims
- Missing expected citations in responses
- Retrieval latency outliers
- Context length distributions

### Recommendation Framework

When suggesting context retrieval improvements:
- Analyze retrieval query patterns
- Suggest embedding model or chunking changes
- Recommend re-ranking strategies
- Propose context compression techniques
- Consider hybrid search approaches
- Evaluate citation and attribution requirements
- Suggest query expansion or decomposition strategies
`;

/**
 * Returns specialized analysis guidance for context retrieval issues.
 */
export function getContextRetrievalCategoryGuidance(): string {
  return CONTEXT_RETRIEVAL_CATEGORY_PROMPT;
}
