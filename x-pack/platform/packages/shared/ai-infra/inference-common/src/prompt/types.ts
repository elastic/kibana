/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { MessageRole, ToolOptions } from '../chat_complete';
import { Model } from '../model_provider';

export interface ModelMatch extends Model {
  id?: string;
}

export interface StaticPromptTemplate {
  static: {
    content: string;
  };
}

export interface MustachePromptTemplate {
  mustache: {
    template: string;
  };
}

export interface ChatPromptTemplate {
  chat: {
    messages: Array<{
      content: string;
      role: MessageRole.User | MessageRole.Assistant;
    }>;
  };
}

export type PromptTemplate = MustachePromptTemplate | ChatPromptTemplate | StaticPromptTemplate;

export type PromptVersion<TToolOptions extends ToolOptions = ToolOptions> = {
  models?: ModelMatch[];
  system?: string | MustachePromptTemplate;
  template: MustachePromptTemplate | ChatPromptTemplate | StaticPromptTemplate;
  temperature?: number;
} & TToolOptions;

export interface Prompt<TInput = any, TPromptVersions extends PromptVersion[] = PromptVersion[]> {
  name: string;
  description: string;
  input: z.Schema<TInput>;
  versions: TPromptVersions;
}

export interface PromptFactory<
  TInput = any,
  TPromptVersions extends PromptVersion[] = PromptVersion[]
> {
  version<TNextPromptVersion extends PromptVersion>(
    version: TNextPromptVersion
  ): PromptFactory<TInput, [...TPromptVersions, TNextPromptVersion]>;
  get: () => Prompt<TInput, TPromptVersions>;
}

export type ToolOptionsOfPrompt<TPrompt extends Prompt> = TPrompt['versions'] extends Array<
  infer TPromptVersion
>
  ? TPromptVersion extends PromptVersion
    ? Pick<TPromptVersion, 'tools' | 'toolChoice'>
    : never
  : never;
