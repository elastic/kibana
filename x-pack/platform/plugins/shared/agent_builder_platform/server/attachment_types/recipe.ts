/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';

export const RECIPE_ATTACHMENT_TYPE = 'recipe';

export const recipeAttachmentDataSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.string(),
  prepTime: z.string().optional(),
  cookTime: z.string().optional(),
  servings: z.number().optional(),
});

/**
 * Data for a recipe attachment.
 */
export interface RecipeAttachmentData {
  /** Name of the recipe */
  name: string;
  /** List of ingredients */
  ingredients: string[];
  /** Cooking instructions */
  instructions: string;
  /** Optional prep time */
  prepTime?: string;
  /** Optional cook time */
  cookTime?: string;
  /** Optional number of servings */
  servings?: number;
}

/**
 * Creates the definition for the `recipe` attachment type.
 * NOTE: This is a demo/example attachment type for testing purposes.
 */
export const createRecipeAttachmentType = (): AttachmentTypeDefinition<
  typeof RECIPE_ATTACHMENT_TYPE,
  RecipeAttachmentData
> => {
  return {
    id: RECIPE_ATTACHMENT_TYPE,
    validate: (input) => {
      const parseResult = recipeAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          const { name, ingredients, instructions, prepTime, cookTime, servings } = attachment.data;
          const parts = [`Recipe: ${name}`];

          if (prepTime) parts.push(`Prep Time: ${prepTime}`);
          if (cookTime) parts.push(`Cook Time: ${cookTime}`);
          if (servings) parts.push(`Servings: ${servings}`);

          parts.push(`\nIngredients:\n${ingredients.map((i) => `- ${i}`).join('\n')}`);
          parts.push(`\nInstructions:\n${instructions}`);

          return { type: 'text', value: parts.join('\n') };
        },
      };
    },
    getTools: () => [],
    getAgentDescription: () =>
      'A recipe attachment containing cooking instructions, ingredients, and preparation details.',
  };
};
