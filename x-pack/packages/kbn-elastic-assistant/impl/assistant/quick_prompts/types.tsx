/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromptContext } from '../../..';

/**
 * A QuickPrompt is a badge that is displayed below the Assistant's input field. They provide
 * a quick way for users to insert prompts as templates into the Assistant's input field. If no
 * categories are provided they will always display with the assistant, however categories can be
 * supplied to only display the QuickPrompt when the Assistant is registered with corresponding
 * PromptContext's containing the same category.
 *
 * isDefault: If true, this QuickPrompt cannot be deleted by the user
 */
export interface QuickPrompt {
  title: string;
  prompt: string;
  color: string;
  categories?: Array<PromptContext['category']>;
  isDefault?: boolean;
}
