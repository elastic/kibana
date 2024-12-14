/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateGraphArgs } from '@langchain/langgraph';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { LogFormatDetectionState } from '../../types';
import { EX_ANSWER_LOG_TYPE } from './constants';
import { handleLogFormatDetection } from './detection';
import { handleCSV } from '../csv/csv';
import { ESProcessorItem, SamplesFormat } from '../../../common';
import { getKVGraph } from '../kv/graph';
import { LogDetectionGraphParams, LogDetectionBaseNodeParams } from './types';
import { LogFormat } from '../../constants';
import { getUnstructuredGraph } from '../unstructured/graph';

const graphState: StateGraphArgs<LogFormatDetectionState>['channels'] = {
  lastExecutedChain: {
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
  packageTitle: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  dataStreamTitle: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  logSamples: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  jsonSamples: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  exAnswer: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  finalized: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  samplesFormat: {
    value: (x: SamplesFormat, y?: SamplesFormat) => y ?? x,
    default: () => ({ name: 'unsupported' }),
  },
  header: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  ecsVersion: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '8.11.0',
  },
  results: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  additionalProcessors: {
    value: (x: ESProcessorItem[], y?: ESProcessorItem[]) => y ?? x,
    default: () => [],
  },
};

function modelInput({ state }: LogDetectionBaseNodeParams): Partial<LogFormatDetectionState> {
  return {
    exAnswer: JSON.stringify(EX_ANSWER_LOG_TYPE, null, 2),
    finalized: false,
    lastExecutedChain: 'modelInput',
  };
}

function modelOutput({ state }: LogDetectionBaseNodeParams): Partial<LogFormatDetectionState> {
  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
    results: {
      samplesFormat: state.samplesFormat,
      parsedSamples: state.jsonSamples,
      additionalProcessors: state.additionalProcessors,
    },
  };
}

function logFormatRouter({ state }: LogDetectionBaseNodeParams): string {
  if (state.samplesFormat.name === LogFormat.STRUCTURED) {
    return 'structured';
  }
  if (state.samplesFormat.name === LogFormat.UNSTRUCTURED) {
    return 'unstructured';
  }
  if (state.samplesFormat.name === LogFormat.CSV) {
    return 'csv';
  }
  return 'unsupported';
}

export async function getLogFormatDetectionGraph({ model, client }: LogDetectionGraphParams) {
  const workflow = new StateGraph({
    channels: graphState,
  })
    .addNode('modelInput', (state: LogFormatDetectionState) => modelInput({ state }))
    .addNode('modelOutput', (state: LogFormatDetectionState) => modelOutput({ state }))
    .addNode('handleLogFormatDetection', (state: LogFormatDetectionState) =>
      handleLogFormatDetection({ state, model, client })
    )
    .addNode(
      'handleKVGraph',
      (await getKVGraph({ model, client })).withConfig({ runName: 'Key-Value' })
    )
    .addNode(
      'handleUnstructuredGraph',
      (await getUnstructuredGraph({ model, client })).withConfig({ runName: 'Unstructured' })
    )
    .addNode('handleCSV', (state: LogFormatDetectionState) => handleCSV({ state, model, client }))
    .addEdge(START, 'modelInput')
    .addEdge('modelInput', 'handleLogFormatDetection')
    .addEdge('handleKVGraph', 'modelOutput')
    .addEdge('handleUnstructuredGraph', 'modelOutput')
    .addEdge('handleCSV', 'modelOutput')
    .addEdge('modelOutput', END)
    .addConditionalEdges(
      'handleLogFormatDetection',
      (state: LogFormatDetectionState) => logFormatRouter({ state }),
      {
        structured: 'handleKVGraph',
        unstructured: 'handleUnstructuredGraph',
        csv: 'handleCSV',
        unsupported: 'modelOutput',
      }
    );

  const compiledLogFormatDetectionGraph = workflow.compile();
  return compiledLogFormatDetectionGraph;
}
