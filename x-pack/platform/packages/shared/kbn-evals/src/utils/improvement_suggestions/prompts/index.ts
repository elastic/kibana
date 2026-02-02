/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ANALYSIS_SYSTEM_PROMPT,
  generateAnalysisUserPrompt,
  buildAnalysisPrompt,
  cleanPrompt,
  type AnalysisPromptInput,
} from './analysis_prompt';

export {
  SUMMARIZE_SYSTEM_PROMPT,
  generateSummarizeUserPrompt,
  buildSummarizePrompt,
  type SummarizePromptInput,
} from './summarize_prompt';

// Category-specific sub-prompts
export {
  // Individual category prompts
  PROMPT_CATEGORY_PROMPT,
  TOOL_SELECTION_CATEGORY_PROMPT,
  RESPONSE_QUALITY_CATEGORY_PROMPT,
  CONTEXT_RETRIEVAL_CATEGORY_PROMPT,
  REASONING_CATEGORY_PROMPT,
  ACCURACY_CATEGORY_PROMPT,
  EFFICIENCY_CATEGORY_PROMPT,
  OTHER_CATEGORY_PROMPT,
  // Getter functions
  getPromptCategoryGuidance,
  getToolSelectionCategoryGuidance,
  getResponseQualityCategoryGuidance,
  getContextRetrievalCategoryGuidance,
  getReasoningCategoryGuidance,
  getAccuracyCategoryGuidance,
  getEfficiencyCategoryGuidance,
  getOtherCategoryGuidance,
  // Utility functions
  CATEGORY_PROMPTS,
  getCategoryPrompt,
  getCategoryGuidance,
  getCategoryPromptsForCategories,
  getAllCategoryPrompts,
  getAvailableCategories,
} from './categories';
