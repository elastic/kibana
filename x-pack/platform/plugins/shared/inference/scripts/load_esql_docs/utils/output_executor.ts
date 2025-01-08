/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OutputAPI } from '@kbn/inference-common';

export interface Prompt {
  system?: string;
  input: string;
}

export type PromptTemplate<Input> = (input: Input) => Prompt;

export type PromptCaller = (prompt: Prompt) => Promise<string>;

export type PromptCallerFactory = ({
  connectorId,
  output,
}: {
  connectorId: string;
  output: OutputAPI;
}) => PromptCaller;

export const bindOutput: PromptCallerFactory = ({ connectorId, output }) => {
  return async ({ input, system }) => {
    const response = await output({
      id: 'output',
      connectorId,
      input,
      system,
    });

    return response.content ?? '';
  };
};
