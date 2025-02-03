/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StringOutputParser } from '@langchain/core/output_parsers';
import { CelInputState } from '../../types';
import { SAMPLE_CEL_PROGRAMS_OAUTH } from './constants';
import { CEL_AUTH_OAUTH2_PROMPT } from './prompts';
import { CelInputNodeParams } from './types';

export async function handleUpdateProgramOauth2({
  state,
  model,
}: CelInputNodeParams): Promise<Partial<CelInputState>> {
  const outputParser = new StringOutputParser();
  const updateCelProgramHeadersGraph = CEL_AUTH_OAUTH2_PROMPT.pipe(model).pipe(outputParser);

  const updatedProgram = await updateCelProgramHeadersGraph.invoke({
    cel_program: state.currentProgram,
    open_api_auth_schema: state.openApiAuthSchema,
    example_cel_programs: SAMPLE_CEL_PROGRAMS_OAUTH,
  });

  return {
    currentProgram: updatedProgram.trim(),
    lastExecutedChain: 'updateProgramOAuth2',
  };
}
