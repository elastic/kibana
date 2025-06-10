/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Prompt, PromptFactory, PromptVersion } from './types';

export function createPrompt<TInput>(init: {
  name: string;
  description: string;
  input: z.Schema<TInput>;
}): PromptFactory<TInput, []> {
  function inner<TVersions extends PromptVersion[], TNextVersions extends PromptVersion[]>(
    source: Prompt<TInput, TVersions>,
    ...versions: TNextVersions
  ): PromptFactory<TInput, [...TVersions, ...TNextVersions]> {
    const next: Prompt<TInput, [...TVersions, ...TNextVersions]> = {
      ...source,
      versions: [...source.versions, ...versions],
    };

    return {
      version: (version) => inner(next, version),
      get: () => next,
    };
  }

  return inner({ ...init, versions: [] as [] });
}
