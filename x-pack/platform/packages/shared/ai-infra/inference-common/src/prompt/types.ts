/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type { MessageRole } from '../chat_complete';
import type { Model } from '../model_provider';
import type { ToolDefinitions } from '../chat_complete/tools';

/**
 * Defines the matching criteria for a {@link PromptVersion},
 * e.g. `{ provider: ModelProvider.Google, family: ModelProvider.Gemini, id: 'gemini-2.5-pro' }`
 */
export interface ModelMatch extends Model {
  id?: string;
}

/**
 * A static, non-compiled prompt template
 */
export interface StaticPromptTemplate {
  static: {
    content: string;
  };
}

/**
 * A prompt template that is compiled and rendered with Mustache
 * and supports variable interpolation.
 */
export interface MustachePromptTemplate {
  mustache: {
    template: string;
  };
}

/**
 * A structured template that supports multiple messages
 * as a starting point.
 */
export interface ChatPromptTemplate {
  chat: {
    messages: Array<{
      content: string;
      role: MessageRole.User | MessageRole.Assistant;
    }>;
  };
}

/**
 * The template to use for the {@link Prompt}
 */
export type PromptTemplate = MustachePromptTemplate | ChatPromptTemplate | StaticPromptTemplate;

/**
 * The variant of a prompt which will be used in the request if it's the
 * best fit for the given model.
 */
export interface PromptVersion<
  TTools extends ToolDefinitions | undefined = ToolDefinitions | undefined
> {
  /**
   * A list of {@link ModelMatch} objects. If none are given, it will be
   * interpreted as a fallback match-all version.
   */
  models?: ModelMatch[];
  /**
   * The system prompt or template to be used.
   */
  system?: string | MustachePromptTemplate;
  /**
   * The user or chat prompt template to be used.
   */
  template: MustachePromptTemplate | ChatPromptTemplate | StaticPromptTemplate;
  /**
   * The temperature for the chatComplete request.
   */
  temperature?: number;
  /**
   * Tool definitions that will be send over to the LLM.
   */
  tools?: TTools;
}

/**
 * A Prompt defines the request that will be send over to the LLM.
 * By specifying versions, you can use specific system and user prompt
 * templates for specific models.
 */
export interface Prompt<TInput = any, TPromptVersions extends PromptVersion[] = PromptVersion[]> {
  /**
   * The name of the prompt. Used for telemetry
   */
  name: string;
  /**
   * A human-readable description of what the prompt does. Used for evaluations.
   */
  description?: string;
  /**
   * A zod schema that will validate and transform the input variables for a prompt.
   */
  input: z.Schema<TInput>;
  /**
   * The model-specific variants of the prompt.
   */
  versions: TPromptVersions;
}

/**
 * Utility function that creates a fully typed Prompt
 */
export interface PromptFactory<
  TInput = any,
  TPromptVersions extends PromptVersion[] = PromptVersion[]
> {
  version<TNextPromptVersion extends PromptVersion>(
    version: TNextPromptVersion
  ): PromptFactory<TInput, [...TPromptVersions, TNextPromptVersion]>;
  get: () => Prompt<TInput, TPromptVersions>;
}

/**
 * Utility function that returns the tool options for a Prompt that
 * can be used to infer the response shape.
 */
export type ToolOptionsOfPrompt<TPrompt extends Prompt> = TPrompt['versions'] extends Array<
  infer TPromptVersion
>
  ? TPromptVersion extends PromptVersion
    ? Pick<TPromptVersion, 'tools'>
    : {}
  : {};
