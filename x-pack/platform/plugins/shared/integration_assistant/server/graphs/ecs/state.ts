/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateGraphArgs } from '@langchain/langgraph';
import { ESProcessorItem, SamplesFormat } from '../../../common';
import type { EcsMappingState } from '../../types';
import { merge } from '../../util/samples';

export const graphState: StateGraphArgs<EcsMappingState>['channels'] = {
  ecs: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  chunkSize: {
    value: (x: number, y?: number) => y ?? x,
    default: () => 25,
  },
  lastExecutedChain: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  rawSamples: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  additionalProcessors: {
    value: (x: ESProcessorItem[], y?: ESProcessorItem[]) => y ?? x,
    default: () => [],
  },
  prefixedSamples: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  combinedSamples: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  sampleChunks: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
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
  currentMapping: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  chunkMapping: {
    reducer: merge,
    default: () => ({}),
  },
  finalMapping: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  useFinalMapping: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  hasTriedOnce: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  currentPipeline: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  duplicateFields: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  missingKeys: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  invalidEcsFields: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  results: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  samplesFormat: {
    value: (x: SamplesFormat, y?: SamplesFormat) => y ?? x,
    default: () => ({ name: 'json' }),
  },
  ecsVersion: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '8.11.0',
  },
};
