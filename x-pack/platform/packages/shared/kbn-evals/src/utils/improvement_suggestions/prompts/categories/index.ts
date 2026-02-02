/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImprovementSuggestionCategorySchema } from '../../schemas';

import { PROMPT_CATEGORY_PROMPT, getPromptCategoryGuidance } from './prompt';
import { TOOL_SELECTION_CATEGORY_PROMPT, getToolSelectionCategoryGuidance } from './tool_selection';
import {
  RESPONSE_QUALITY_CATEGORY_PROMPT,
  getResponseQualityCategoryGuidance,
} from './response_quality';
import {
  CONTEXT_RETRIEVAL_CATEGORY_PROMPT,
  getContextRetrievalCategoryGuidance,
} from './context_retrieval';
import { REASONING_CATEGORY_PROMPT, getReasoningCategoryGuidance } from './reasoning';
import { ACCURACY_CATEGORY_PROMPT, getAccuracyCategoryGuidance } from './accuracy';
import { EFFICIENCY_CATEGORY_PROMPT, getEfficiencyCategoryGuidance } from './efficiency';
import { OTHER_CATEGORY_PROMPT, getOtherCategoryGuidance } from './other';

// Re-export individual category prompts
export { PROMPT_CATEGORY_PROMPT, getPromptCategoryGuidance } from './prompt';
export { TOOL_SELECTION_CATEGORY_PROMPT, getToolSelectionCategoryGuidance } from './tool_selection';
export {
  RESPONSE_QUALITY_CATEGORY_PROMPT,
  getResponseQualityCategoryGuidance,
} from './response_quality';
export {
  CONTEXT_RETRIEVAL_CATEGORY_PROMPT,
  getContextRetrievalCategoryGuidance,
} from './context_retrieval';
export { REASONING_CATEGORY_PROMPT, getReasoningCategoryGuidance } from './reasoning';
export { ACCURACY_CATEGORY_PROMPT, getAccuracyCategoryGuidance } from './accuracy';
export { EFFICIENCY_CATEGORY_PROMPT, getEfficiencyCategoryGuidance } from './efficiency';
export { OTHER_CATEGORY_PROMPT, getOtherCategoryGuidance } from './other';

/**
 * Map of category names to their corresponding prompt content.
 */
export const CATEGORY_PROMPTS: Record<ImprovementSuggestionCategorySchema, string> = {
  prompt: PROMPT_CATEGORY_PROMPT,
  tool_selection: TOOL_SELECTION_CATEGORY_PROMPT,
  response_quality: RESPONSE_QUALITY_CATEGORY_PROMPT,
  context_retrieval: CONTEXT_RETRIEVAL_CATEGORY_PROMPT,
  reasoning: REASONING_CATEGORY_PROMPT,
  accuracy: ACCURACY_CATEGORY_PROMPT,
  efficiency: EFFICIENCY_CATEGORY_PROMPT,
  other: OTHER_CATEGORY_PROMPT,
};

/**
 * Map of category names to their guidance getter functions.
 */
const CATEGORY_GUIDANCE_GETTERS: Record<ImprovementSuggestionCategorySchema, () => string> = {
  prompt: getPromptCategoryGuidance,
  tool_selection: getToolSelectionCategoryGuidance,
  response_quality: getResponseQualityCategoryGuidance,
  context_retrieval: getContextRetrievalCategoryGuidance,
  reasoning: getReasoningCategoryGuidance,
  accuracy: getAccuracyCategoryGuidance,
  efficiency: getEfficiencyCategoryGuidance,
  other: getOtherCategoryGuidance,
};

/**
 * Retrieves the category-specific sub-prompt for a given category.
 * @param category - The improvement suggestion category
 * @returns The category-specific prompt content
 */
export function getCategoryPrompt(category: ImprovementSuggestionCategorySchema): string {
  return CATEGORY_PROMPTS[category];
}

/**
 * Retrieves category-specific guidance using the getter function.
 * @param category - The improvement suggestion category
 * @returns The category-specific guidance content
 */
export function getCategoryGuidance(category: ImprovementSuggestionCategorySchema): string {
  return CATEGORY_GUIDANCE_GETTERS[category]();
}

/**
 * Retrieves prompts for multiple categories and combines them.
 * @param categories - Array of categories to include
 * @returns Combined prompt content for all specified categories
 */
export function getCategoryPromptsForCategories(
  categories: ImprovementSuggestionCategorySchema[]
): string {
  return categories.map((category) => getCategoryPrompt(category)).join('\n\n---\n\n');
}

/**
 * Retrieves all category prompts combined into a single string.
 * Useful for providing comprehensive guidance in the analysis prompt.
 * @returns All category prompts combined
 */
export function getAllCategoryPrompts(): string {
  return Object.values(CATEGORY_PROMPTS).join('\n\n---\n\n');
}

/**
 * Lists all available improvement suggestion categories.
 * @returns Array of all category names
 */
export function getAvailableCategories(): ImprovementSuggestionCategorySchema[] {
  return Object.keys(CATEGORY_PROMPTS) as ImprovementSuggestionCategorySchema[];
}
