/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateGraphArgs } from '@langchain/langgraph';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { ApiAnalysisState } from '../../types';

import { ApiAnalysisGraphParams, ApiAnalysisBaseNodeParams } from './types';
import { handleGetSuggestedPaths } from './paths';

const graphState: StateGraphArgs<ApiAnalysisState>['channels'] = {
  dataStreamName: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  pathOptions: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  results: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  suggestedPaths: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  lastExecutedChain: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
};

function modelInput({ state }: ApiAnalysisBaseNodeParams): Partial<ApiAnalysisState> {
  return {
    lastExecutedChain: 'modelInput',
    pathOptions: state.pathOptions,
    dataStreamName: state.dataStreamName,
  };
}

function modelOutput({ state }: ApiAnalysisBaseNodeParams): Partial<ApiAnalysisState> {
  return {
    lastExecutedChain: 'modelOutput',
    results: {
      suggestedPaths: state.suggestedPaths,
    },
  };
}

export async function getApiAnalysisGraph({ model }: ApiAnalysisGraphParams) {
  const workflow = new StateGraph({ channels: graphState })
    .addNode('modelInput', (state: ApiAnalysisState) => modelInput({ state }))
    .addNode('handleGetSuggestedPaths', (state: ApiAnalysisState) =>
      handleGetSuggestedPaths({ state, model })
    )
    .addNode('modelOutput', (state: ApiAnalysisState) => modelOutput({ state }))
    .addEdge(START, 'modelInput')
    .addEdge('modelInput', 'handleGetSuggestedPaths')
    .addEdge('handleGetSuggestedPaths', 'modelOutput')
    .addEdge('modelOutput', END);
  const compiledApiAnalysisGraph = workflow.compile();
  return compiledApiAnalysisGraph;
}
