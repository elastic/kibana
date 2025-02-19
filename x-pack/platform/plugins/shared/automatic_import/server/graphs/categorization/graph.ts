/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateGraphArgs } from '@langchain/langgraph';
import { StateGraph, END, START } from '@langchain/langgraph';
import { SamplesFormat } from '../../../common';
import type { CategorizationState } from '../../types';
import { handleValidatePipeline } from '../../util/graph';
import { prefixSamples } from '../../util/samples';
import { handleCategorization } from './categorization';
import { CATEGORIZATION_EXAMPLE_ANSWER, ECS_CATEGORIES, ECS_TYPES } from './constants';
import { handleErrors } from './errors';
import { handleInvalidCategorization } from './invalid';
import { handleReview } from './review';
import type { CategorizationBaseNodeParams, CategorizationGraphParams } from './types';
import { handleCategorizationValidation } from './validate';
import { handleUpdateStableSamples } from './stable';
import { CATEGORIZATION_REVIEW_MAX_CYCLES } from '../../../common/constants';

const graphState: StateGraphArgs<CategorizationState>['channels'] = {
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
  ecsTypes: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  ecsCategories: {
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
  stableSamples: {
    value: (x: number[], y: number[]) => y ?? x,
    default: () => [],
  },
  reviewCount: {
    value: (x: number, y: number) => y ?? x,
    default: () => 0,
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
    default: () => [{}],
  },
  previousPipelineResults: {
    value: (x: object[], y?: object[]) => y ?? x,
    default: () => [{}],
  },
  lastReviewedSamples: {
    value: (x: number[], y: number[]) => y ?? x,
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
  invalidCategorization: {
    value: (x: object[], y?: object[]) => y ?? x,
    default: () => [],
  },
  previousInvalidCategorization: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
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

function modelInput({ state }: CategorizationBaseNodeParams): Partial<CategorizationState> {
  let samples: string[];
  if (state.samplesFormat.name === 'json' || state.samplesFormat.name === 'ndjson') {
    samples = prefixSamples(state);
  } else {
    samples = state.rawSamples;
  }

  const initialPipeline = JSON.parse(JSON.stringify(state.currentPipeline));
  return {
    exAnswer: JSON.stringify(CATEGORIZATION_EXAMPLE_ANSWER, null, 2),
    ecsCategories: JSON.stringify(ECS_CATEGORIES, null, 2),
    ecsTypes: JSON.stringify(ECS_TYPES, null, 2),
    samples,
    initialPipeline,
    stableSamples: [],
    lastExecutedChain: 'modelInput',
  };
}

function modelOutput({ state }: CategorizationBaseNodeParams): Partial<CategorizationState> {
  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
    results: {
      docs: state.pipelineResults,
      pipeline: state.currentPipeline,
    },
  };
}

function validationRouter({ state }: CategorizationBaseNodeParams): string {
  if (Object.keys(state.currentProcessors).length === 0) {
    if (state.stableSamples.length === state.pipelineResults.length) {
      return 'modelOutput';
    }
    return 'categorization';
  }
  return 'validateCategorization';
}

function chainRouter({ state }: CategorizationBaseNodeParams): string {
  if (Object.keys(state.currentProcessors).length === 0) {
    if (state.stableSamples.length === state.pipelineResults.length) {
      return 'modelOutput';
    }
  }

  if (Object.keys(state.errors).length > 0) {
    return 'errors';
  }

  if (Object.keys(state.invalidCategorization).length > 0) {
    return 'invalidCategorization';
  }

  if (
    state.stableSamples.length < state.pipelineResults.length &&
    state.reviewCount < CATEGORIZATION_REVIEW_MAX_CYCLES
  ) {
    return 'review';
  }

  return 'modelOutput';
}

export async function getCategorizationGraph({ client, model }: CategorizationGraphParams) {
  const workflow = new StateGraph({
    channels: graphState,
  })
    .addNode('modelInput', (state: CategorizationState) => modelInput({ state }))
    .addNode('modelOutput', (state: CategorizationState) => modelOutput({ state }))
    .addNode('handleCategorization', (state: CategorizationState) =>
      handleCategorization({ state, model })
    )
    .addNode('handleValidatePipeline', (state: CategorizationState) =>
      handleValidatePipeline({ state, client })
    )
    .addNode('handleUpdateStableSamples', (state: CategorizationState) =>
      handleUpdateStableSamples({ state })
    )
    .addNode('handleCategorizationValidation', (state: CategorizationState) =>
      handleCategorizationValidation({ state })
    )
    .addNode('handleInvalidCategorization', (state: CategorizationState) =>
      handleInvalidCategorization({ state, model })
    )
    .addNode('handleErrors', (state: CategorizationState) => handleErrors({ state, model }))
    .addNode('handleReview', (state: CategorizationState) => handleReview({ state, model }))
    .addEdge(START, 'modelInput')
    .addEdge('modelOutput', END)
    .addEdge('modelInput', 'handleValidatePipeline')
    .addEdge('handleCategorization', 'handleCategorizationValidation')
    .addEdge('handleInvalidCategorization', 'handleValidatePipeline')
    .addEdge('handleErrors', 'handleValidatePipeline')
    .addEdge('handleReview', 'handleValidatePipeline')
    .addEdge('handleValidatePipeline', 'handleUpdateStableSamples')
    .addConditionalEdges(
      'handleUpdateStableSamples',
      (state: CategorizationState) => validationRouter({ state }),
      {
        modelOutput: 'modelOutput',
        categorization: 'handleCategorization',
        validateCategorization: 'handleCategorizationValidation',
      }
    )
    .addConditionalEdges(
      'handleCategorizationValidation',
      (state: CategorizationState) => chainRouter({ state }),
      {
        modelOutput: 'modelOutput',
        errors: 'handleErrors',
        invalidCategorization: 'handleInvalidCategorization',
        review: 'handleReview',
      }
    );

  const compiledCategorizationGraph = workflow.compile();
  return compiledCategorizationGraph;
}
