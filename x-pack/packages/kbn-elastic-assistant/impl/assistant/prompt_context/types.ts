/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

/**
 * helps the Elastic Assistant display the most relevant user prompts
 */
export type PromptContextCategory =
  | 'alert'
  | 'alerts'
  | 'event'
  | 'events'
  | 'data-quality-index-summary'
  | string;

/**
 * This interface is used to pass context to the Elastic Assistant,
 * for the purpose of building prompts. Examples of context include:
 * - a single alert
 * - multiple alerts
 * - a single event
 * - multiple events
 * - markdown
 * - csv
 * - anything else that the LLM can interpret
 */
export interface PromptContext {
  /**
   * The category of data, e.g. `alert | alerts | event | events | string`
   *
   * `category` helps the Elastic Assistant display the most relevant user prompts
   */
  category: PromptContextCategory;

  /**
   * The Elastic Assistant will display this **short**, static description
   * in the context pill
   */
  description: string;

  /**
   * The Elastic Assistant will invoke this function to retrieve the context data,
   * which will be included in a prompt (e.g. the contents of an alert or an event)
   */
  getPromptContext: () => Promise<string>;

  /**
   * A unique identifier for this prompt context
   */
  id: string;
  /**
   * An optional user prompt that's filled in, but not sent, when the Elastic Assistant opens
   */
  suggestedUserPrompt?: string;

  /**
   * The Elastic Assistant will display this tooltip when the user hovers over the context pill
   */
  tooltip: ReactNode;
}

export type UnRegisterPromptContext = (promptContextId: string) => void;

export type RegisterPromptContext = (promptContext: PromptContext) => void;
