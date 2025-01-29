/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StringOutputParser } from '@langchain/core/output_parsers';
import { CelInputState } from '../../types';
import { SAMPLE_CEL_PROGRAMS } from './constants';
import { CEL_AUTH_DIGEST_PROMPT } from './prompts';
import { CelInputNodeParams } from './types';

export async function handleRemoveHeadersDigest({
  state,
  model,
}: CelInputNodeParams): Promise<Partial<CelInputState>> {
  const outputParser = new StringOutputParser();
  const updateCelProgramDigestGraph = CEL_AUTH_DIGEST_PROMPT.pipe(model).pipe(outputParser);

  const updatedProgram = await updateCelProgramDigestGraph.invoke({
    cel_program: state.currentProgram,
    example_cel_programs: SAMPLE_CEL_PROGRAMS,
  });

  return {
    currentProgram: updatedProgram.trim(),
    lastExecutedChain: 'removeHeadersDigest',
  };
}
