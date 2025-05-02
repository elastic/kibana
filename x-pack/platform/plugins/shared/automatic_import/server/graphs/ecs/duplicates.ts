/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { EcsMappingState } from '../../types';
import { ECS_DUPLICATES_PROMPT } from './prompts';
import type { EcsNodeParams } from './types';

export async function handleDuplicates({
  state,
  model,
}: EcsNodeParams): Promise<Partial<EcsMappingState>> {
  const outputParser = new JsonOutputParser();
  const ecsDuplicatesGraph = ECS_DUPLICATES_PROMPT.pipe(model).pipe(outputParser);
  const usesFinalMapping = state?.useFinalMapping;
  const mapping = usesFinalMapping ? state.finalMapping : state.currentMapping;

  const result = await ecsDuplicatesGraph.invoke({
    ecs: state.ecs,
    current_mapping: JSON.stringify(mapping, null, 2),
    ex_answer: state.exAnswer,
    duplicate_fields: state.duplicateFields,
  });

  return {
    [usesFinalMapping ? 'finalMapping' : 'currentMapping']: result,
    lastExecutedChain: 'duplicateFields',
  };
}
