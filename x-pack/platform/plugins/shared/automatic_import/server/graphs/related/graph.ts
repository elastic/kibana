/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateGraphArgs } from '@langchain/langgraph';
import { StateGraph, END, START } from '@langchain/langgraph';
import { SamplesFormat } from '../../../common';
import type { RelatedState } from '../../types';
import { handleValidatePipeline } from '../../util/graph';
import { prefixSamples } from '../../util/samples';
import { RELATED_ECS_FIELDS, RELATED_EXAMPLE_ANSWER } from './constants';
import { handleErrors } from './errors';
import { handleRelated } from './related';
import { handleReview } from './review';
import type { RelatedBaseNodeParams, RelatedGraphParams } from './types';

const graphState: StateGraphArgs<RelatedState>['channels'] = {
  lastExecutedChain: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  rawSamples: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  samples: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  hasTriedOnce: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  ecs: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  exAnswer: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  packageName: {
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
  reviewed: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  errors: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  previousError: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  pipelineResults: {
    value: (x: object[], y?: object[]) => y ?? x,
    default: () => [],
  },
  currentPipeline: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  currentProcessors: {
    value: (x: object[], y?: object[]) => y ?? x,
    default: () => [],
  },
  initialPipeline: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  results: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  samplesFormat: {
    value: (x: SamplesFormat, y?: SamplesFormat) => y ?? x,
    default: () => ({ name: 'unsupported' }),
  },
};

function modelInput({ state }: RelatedBaseNodeParams): Partial<RelatedState> {
  let samples: string[];
  if (state.samplesFormat.name === 'json' || state.samplesFormat.name === 'ndjson') {
    samples = prefixSamples(state);
  } else {
    samples = state.rawSamples;
  }

  const initialPipeline = JSON.parse(JSON.stringify(state.currentPipeline));
  return {
    exAnswer: JSON.stringify(RELATED_EXAMPLE_ANSWER, null, 2),
    ecs: JSON.stringify(RELATED_ECS_FIELDS, null, 2),
    samples,
    initialPipeline,
    finalized: false,
    reviewed: false,
    lastExecutedChain: 'modelInput',
  };
}

function modelOutput({ state }: RelatedBaseNodeParams): Partial<RelatedState> {
  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
    results: {
      docs: state.pipelineResults,
      pipeline: state.currentPipeline,
    },
  };
}

function inputRouter({ state }: RelatedBaseNodeParams): string {
  if (Object.keys(state.pipelineResults).length === 0) {
    return 'validatePipeline';
  }
  return 'related';
}

function chainRouter({ state }: RelatedBaseNodeParams): string {
  if (Object.keys(state.currentProcessors).length === 0) {
    if (state.hasTriedOnce || state.reviewed) {
      return 'modelOutput';
    }
    return 'related';
  }
  if (Object.keys(state.errors).length > 0) {
    return 'errors';
  }
  if (!state.reviewed) {
    return 'review';
  }
  if (!state.finalized) {
    return 'modelOutput';
  }
  return END;
}

export async function getRelatedGraph({ client, model }: RelatedGraphParams) {
  const workflow = new StateGraph({ channels: graphState })
    .addNode('modelInput', (state: RelatedState) => modelInput({ state }))
    .addNode('modelOutput', (state: RelatedState) => modelOutput({ state }))
    .addNode('handleRelated', (state: RelatedState) => handleRelated({ state, model }))
    .addNode('handleValidatePipeline', (state: RelatedState) =>
      handleValidatePipeline({ state, client })
    )
    .addNode('handleErrors', (state: RelatedState) => handleErrors({ state, model }))
    .addNode('handleReview', (state: RelatedState) => handleReview({ state, model }))
    .addEdge(START, 'modelInput')
    .addEdge('modelOutput', END)
    .addEdge('handleRelated', 'handleValidatePipeline')
    .addEdge('handleErrors', 'handleValidatePipeline')
    .addEdge('handleReview', 'handleValidatePipeline')
    .addConditionalEdges('modelInput', (state: RelatedState) => inputRouter({ state }), {
      related: 'handleRelated',
      validatePipeline: 'handleValidatePipeline',
    })
    .addConditionalEdges(
      'handleValidatePipeline',
      (state: RelatedState) => chainRouter({ state }),
      {
        related: 'handleRelated',
        errors: 'handleErrors',
        review: 'handleReview',
        modelOutput: 'modelOutput',
      }
    );

  const compiledRelatedGraph = workflow.compile();
  return compiledRelatedGraph;
}
