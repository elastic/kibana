/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import type { ReactNode } from 'react';

/**
 * helps the Elastic AI Assistant display the most relevant user prompts
 */
export type PromptContextCategory =
  | 'alert'
  | 'alerts'
  | 'event'
  | 'events'
  | 'data-quality-index-summary'
  | string;

/**
 * This interface is used to pass context to the Elastic AI Assistant,
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
   * `category` helps the Elastic AI Assistant display the most relevant user prompts
   */
  category: PromptContextCategory;

  /**
   * The Elastic AI Assistant will display this **short**, static description
   * in the context pill
   */
  description: string;

  /**
   * The Elastic AI Assistant will invoke this function to retrieve the context data,
   * which will be included in a prompt (e.g. the contents of an alert or an event)
   */
  getPromptContext: () => Promise<string> | Promise<Record<string, string[]>>;

  /**
   * A unique identifier for this prompt context
   */
  id: string;
  /**
   * An optional user prompt that's filled in, but not sent, when the Elastic AI Assistant opens
   */
  suggestedUserPrompt?: string;

  /**
   * The Elastic AI Assistant will display this tooltip when the user hovers over the context pill
   */
  tooltip: ReactNode;
}

/**
 * A prompt context that was added from the pills to the current conversation, but not yet sent
 */
export interface SelectedPromptContext {
  /** fields allowed to be included in a conversation */
  anonymizationFields: FindAnonymizationFieldsResponse;
  /** unique id of the selected `PromptContext` */
  promptContextId: string;
  /** this data is not anonymized  */
  rawData: string | Record<string, string[]>;
}

/**
 * This interface is used to pass a default or base set of contexts to the Elastic AI Assistant when
 * initializing it. This is used to provide 'category' options when users create Quick Prompts.
 * Also, useful for collating all of a solutions' prompts in one place.
 *
 * e.g. see Security Solution's x-pack/plugins/security_solution/public/assistant/prompt_contexts/index.tsx
 */
export type PromptContextTemplate = Omit<PromptContext, 'id' | 'getPromptContext'>;

export type UnRegisterPromptContext = (promptContextId: string) => void;

export type RegisterPromptContext = (promptContext: PromptContext) => void;
