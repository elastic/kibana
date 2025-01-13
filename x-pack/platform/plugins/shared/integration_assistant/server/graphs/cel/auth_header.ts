/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StringOutputParser } from '@langchain/core/output_parsers';
import { CelInputState } from '../../types';
import { CEL_AUTH_HEADERS_PROMPT as CEL_AUTH_HEADER_PROMPT } from './prompts';
import { CelInputNodeParams } from './types';

export async function handleUpdateProgramHeaderAuth({
  state,
  model,
}: CelInputNodeParams): Promise<Partial<CelInputState>> {
  const outputParser = new StringOutputParser();
  const updateCelProgramHeadersGraph = CEL_AUTH_HEADER_PROMPT.pipe(model).pipe(outputParser);

  const updatedProgram = await updateCelProgramHeadersGraph.invoke({
    cel_program: state.currentProgram,
    open_api_auth_schema: state.openApiAuthSchema,
  });

  return {
    currentProgram: updatedProgram.trim(),
    lastExecutedChain: 'updateProgramHeaderAuth',
  };
}
