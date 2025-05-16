/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EcsMappingState } from '../../types';
import { prefixSamples } from '../../util/samples';
import { mergeAndChunkSamples } from './chunk';
import { ECS_EXAMPLE_ANSWER, ECS_FIELDS } from './constants';
import { createPipeline } from './pipeline';
import type { EcsBaseNodeParams } from './types';
import { removeReservedFields } from './validate';

export function modelSubOutput({ state }: EcsBaseNodeParams): Partial<EcsMappingState> {
  return {
    lastExecutedChain: 'modelSubOutput',
    chunkMapping: state.currentMapping,
  };
}

export function modelMergedInputFromSubGraph({
  state,
}: EcsBaseNodeParams): Partial<EcsMappingState> {
  return {
    lastExecutedChain: 'modelMergedInputFromSubGraph',
    useFinalMapping: true,
    finalMapping: state.chunkMapping,
  };
}

export function modelInput({ state }: EcsBaseNodeParams): Partial<EcsMappingState> {
  const prefixedSamples = prefixSamples(state);
  const sampleChunks = mergeAndChunkSamples(prefixedSamples, state.chunkSize);
  return {
    exAnswer: JSON.stringify(ECS_EXAMPLE_ANSWER, null, 2),
    ecs: JSON.stringify(removeReservedFields(ECS_FIELDS), null, 2),
    prefixedSamples,
    sampleChunks,
    finalized: false,
    lastExecutedChain: 'modelInput',
  };
}

export function modelOutput({ state }: EcsBaseNodeParams): Partial<EcsMappingState> {
  const currentPipeline = createPipeline(state);
  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
    results: {
      mapping: state.finalMapping,
      pipeline: currentPipeline,
    },
  };
}
