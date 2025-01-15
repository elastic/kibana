/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, Send, START, StateGraph } from '@langchain/langgraph';
import type { EcsMappingState } from '../../types';
import { handleDuplicates } from './duplicates';
import { handleInvalidEcs } from './invalid';
import { handleEcsMapping } from './mapping';
import { handleMissingKeys } from './missing';
import { modelInput, modelMergedInputFromSubGraph, modelOutput, modelSubOutput } from './model';
import { graphState } from './state';
import type { EcsBaseNodeParams, EcsGraphParams } from './types';
import { handleValidateMappings } from './validate';

const handleCreateMappingChunks = async ({ state }: EcsBaseNodeParams) => {
  // Cherrypick a shallow copy of state to pass to subgraph
  const stateParams = {
    exAnswer: state.exAnswer,
    prefixedSamples: state.prefixedSamples,
    ecs: state.ecs,
    dataStreamName: state.dataStreamName,
    packageName: state.packageName,
    samplesFormat: state.samplesFormat,
    additionalProcessors: state.additionalProcessors,
  };
  if (Object.keys(state.currentMapping).length === 0) {
    return state.sampleChunks.map((chunk) => {
      return new Send('subGraph', { ...stateParams, combinedSamples: chunk });
    });
  }
  return 'modelOutput';
};

function chainRouter({ state }: EcsBaseNodeParams): string {
  if (Object.keys(state.finalMapping).length === 0 && state.hasTriedOnce) {
    return 'modelOutput';
  }
  if (Object.keys(state.duplicateFields).length > 0) {
    return 'duplicateFields';
  }
  if (Object.keys(state.missingKeys).length > 0) {
    return 'missingKeys';
  }
  if (Object.keys(state.invalidEcsFields).length > 0) {
    return 'invalidEcsFields';
  }
  if (!state.finalized) {
    return 'modelOutput';
  }
  return END;
}

// This is added as a separate graph to be able to run these steps concurrently from handleCreateMappingChunks
export async function getEcsSubGraph({ model }: EcsGraphParams) {
  const workflow = new StateGraph({
    channels: graphState,
  })
    .addNode('modelSubOutput', (state: EcsMappingState) => modelSubOutput({ state }))
    .addNode('handleValidation', (state: EcsMappingState) => handleValidateMappings({ state }))
    .addNode('handleEcsMapping', (state: EcsMappingState) => handleEcsMapping({ state, model }))
    .addNode('handleDuplicates', (state: EcsMappingState) => handleDuplicates({ state, model }))
    .addNode('handleMissingKeys', (state: EcsMappingState) => handleMissingKeys({ state, model }))
    .addNode('handleInvalidEcs', (state: EcsMappingState) => handleInvalidEcs({ state, model }))
    .addEdge(START, 'handleEcsMapping')
    .addEdge('handleEcsMapping', 'handleValidation')
    .addEdge('handleDuplicates', 'handleValidation')
    .addEdge('handleMissingKeys', 'handleValidation')
    .addEdge('handleInvalidEcs', 'handleValidation')
    .addConditionalEdges('handleValidation', (state: EcsMappingState) => chainRouter({ state }), {
      duplicateFields: 'handleDuplicates',
      missingKeys: 'handleMissingKeys',
      invalidEcsFields: 'handleInvalidEcs',
      modelOutput: 'modelSubOutput',
    })
    .addEdge('modelSubOutput', END);

  const compiledEcsSubGraph = workflow.compile();
  return compiledEcsSubGraph;
}

export async function getEcsGraph({ model }: EcsGraphParams) {
  const subGraph = await getEcsSubGraph({ model });
  const workflow = new StateGraph({
    channels: graphState,
  })
    .addNode('modelInput', (state: EcsMappingState) => modelInput({ state }))
    .addNode('modelOutput', (state: EcsMappingState) => modelOutput({ state }))
    .addNode('handleValidation', (state: EcsMappingState) => handleValidateMappings({ state }))
    .addNode('handleDuplicates', (state: EcsMappingState) => handleDuplicates({ state, model }))
    .addNode('handleMissingKeys', (state: EcsMappingState) => handleMissingKeys({ state, model }))
    .addNode('handleInvalidEcs', (state: EcsMappingState) => handleInvalidEcs({ state, model }))
    .addNode('handleMergedSubGraphResponse', (state: EcsMappingState) =>
      modelMergedInputFromSubGraph({ state })
    )
    .addNode('subGraph', subGraph.withConfig({ runName: 'ECS Mapping (Chunk)' }))
    .addEdge(START, 'modelInput')
    .addEdge('subGraph', 'handleMergedSubGraphResponse')
    .addEdge('handleDuplicates', 'handleValidation')
    .addEdge('handleMissingKeys', 'handleValidation')
    .addEdge('handleInvalidEcs', 'handleValidation')
    .addEdge('handleMergedSubGraphResponse', 'handleValidation')
    .addConditionalEdges(
      'modelInput',
      (state: EcsMappingState) => handleCreateMappingChunks({ state }),
      {
        modelOutput: 'modelOutput',
        subGraph: 'subGraph',
      }
    )
    .addConditionalEdges('handleValidation', (state: EcsMappingState) => chainRouter({ state }), {
      duplicateFields: 'handleDuplicates',
      missingKeys: 'handleMissingKeys',
      invalidEcsFields: 'handleInvalidEcs',
      modelOutput: 'modelOutput',
    })
    .addEdge('modelOutput', END);

  const compiledEcsGraph = workflow.compile();
  return compiledEcsGraph;
}
