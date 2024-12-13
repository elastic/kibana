/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateGraphArgs } from '@langchain/langgraph';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { CelInputState } from '../../types';
import { handleBuildProgram } from './build_program';
import { handleGetStateDetails } from './retrieve_state_details';
import { handleGetStateVariables } from './retrieve_state_vars';
import { handleSummarizeQuery } from './summarize_query';
import { CelInputBaseNodeParams, CelInputGraphParams } from './types';

const graphState: StateGraphArgs<CelInputState>['channels'] = {
  lastExecutedChain: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  dataStreamName: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  finalized: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  results: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  apiDefinition: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  apiQuerySummary: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  exampleCelPrograms: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  currentProgram: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  stateVarNames: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  stateSettings: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  redactVars: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
};

function modelInput({ state }: CelInputBaseNodeParams): Partial<CelInputState> {
  return {
    finalized: false,
    lastExecutedChain: 'modelInput',
    apiDefinition: state.apiDefinition,
    dataStreamName: state.dataStreamName,
  };
}

function modelOutput({ state }: CelInputBaseNodeParams): Partial<CelInputState> {
  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
    results: {
      program: state.currentProgram,
      stateSettings: state.stateSettings,
      redactVars: state.redactVars,
    },
  };
}

export async function getCelGraph({ model }: CelInputGraphParams) {
  const workflow = new StateGraph({ channels: graphState })
    .addNode('modelInput', (state: CelInputState) => modelInput({ state }))
    .addNode('handleSummarizeQuery', (state: CelInputState) =>
      handleSummarizeQuery({ state, model })
    )
    .addNode('handleBuildProgram', (state: CelInputState) => handleBuildProgram({ state, model }))
    .addNode('handleGetStateVariables', (state: CelInputState) =>
      handleGetStateVariables({ state, model })
    )
    .addNode('handleGetStateDetails', (state: CelInputState) =>
      handleGetStateDetails({ state, model })
    )
    .addNode('modelOutput', (state: CelInputState) => modelOutput({ state }))
    .addEdge(START, 'modelInput')
    .addEdge('modelOutput', END)
    .addEdge('modelInput', 'handleSummarizeQuery')
    .addEdge('handleSummarizeQuery', 'handleBuildProgram')
    .addEdge('handleBuildProgram', 'handleGetStateVariables')
    .addEdge('handleGetStateVariables', 'handleGetStateDetails')
    .addEdge('handleGetStateDetails', 'modelOutput');

  const compiledCelGraph = workflow.compile();
  return compiledCelGraph;
}
