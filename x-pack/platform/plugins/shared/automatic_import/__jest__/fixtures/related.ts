/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SamplesFormatName } from '../../common';
import type { Pipeline } from '../../common';

export const relatedInitialPipeline: Pipeline = {
  description: 'Pipeline to process mysql_enterprise audit logs',
  processors: [
    {
      set: {
        field: 'ecs.version',
        value: '8.11.0',
      },
    },
    {
      rename: {
        field: 'message',
        target_field: 'event.original',
        ignore_missing: true,
        if: 'ctx.event?.original == null',
      },
    },
    {
      remove: {
        field: 'event.original',
        tag: 'remove_original_event',
        if: 'ctx?.tags == null || !(ctx.tags.contains("preserve_original_event"))',
        ignore_failure: true,
        ignore_missing: true,
      },
    },
  ],
};

export const relatedExpectedResults = {
  docs: [
    {
      key: 'value',
      anotherKey: 'anotherValue',
    },
  ],
  pipeline: {
    description: 'Pipeline to process mysql_enterprise audit logs',
    processors: [
      {
        set: {
          field: 'ecs.version',
          value: '8.11.0',
        },
      },
      {
        append: {
          field: 'related.ip',
          value: '{{{source.ip}}}',
          allow_duplicates: false,
          if: 'ctx.source?.ip != null',
        },
      },
      {
        append: {
          field: 'related.ip',
          value: '{{{destination.ip}}}',
          allow_duplicates: false,
          if: 'ctx.destination?.ip != null',
        },
      },
      {
        rename: {
          field: 'message',
          target_field: 'event.original',
          ignore_missing: true,
          if: 'ctx.event?.original == null',
        },
      },
      {
        remove: {
          field: 'event.original',
          tag: 'remove_original_event',
          if: 'ctx?.tags == null || !(ctx.tags.contains("preserve_original_event"))',
          ignore_failure: true,
          ignore_missing: true,
        },
      },
    ],
  },
};

export const relatedInitialMockedResponse = [
  {
    field: 'related.ip',
    value_field: 'source.ip',
    if: 'ctx.source?.ip != null',
  },
  {
    field: 'related.ip',
    value_field: 'destination.ip',
  },
];

export const relatedErrorMockedResponse = [
  {
    field: 'related.ip',
    value_field: 'source.ip',
  },
  {
    field: 'related.ip',
    value_field: 'destination.ip',
    if: 'ctx.destination?.ip != null',
  },
];

export const relatedReviewMockedResponse = [
  {
    field: 'related.ip',
    value_field: 'source.ip',
    if: 'ctx.source?.ip != null',
  },
  {
    field: 'related.ip',
    value_field: 'destination.ip',
    if: 'ctx.destination?.ip != null',
  },
];

export const testPipelineError: { pipelineResults: object[]; errors: object[] } = {
  pipelineResults: [],
  errors: [{ error: 'Sample error message 1' }, { error: 'Sample error message 2' }],
};

export const testPipelineValidResult: { pipelineResults: object[]; errors: object[] } = {
  pipelineResults: [{ key: 'value', anotherKey: 'anotherValue' }],
  errors: [],
};

export const relatedTestState = {
  rawSamples: ['{"test1": "test1"}'],
  samples: ['{ "test1": "test1" }'],
  ecs: 'testtypes',
  exAnswer: 'testanswer',
  packageName: 'testpackage',
  dataStreamName: 'testDataStream',
  errors: { test: 'testerror' },
  previousError: 'testerror',
  pipelineResults: [{ test: 'testresult' }],
  finalized: false,
  reviewed: false,
  hasTriedOnce: false,
  currentPipeline: { test: 'testpipeline' },
  currentProcessors: [
    {
      field: 'related.ip',
      value_field: 'source.ip',
      if: 'ctx.source?.ip != null',
    },
    {
      field: 'related.ip',
      value_field: 'destination.ip',
      if: 'ctx.destination?.ip != null',
    },
  ],
  initialPipeline: relatedInitialPipeline,
  results: { test: 'testresults' },
  lastExecutedChain: 'testchain',
  samplesFormat: { name: SamplesFormatName.Values.json },
};

export const relatedMockProcessors = [
  {
    field: 'related.user',
    value_field: 'source.user.id',
  },
  {
    field: 'related.ip',
    value_field: 'destination.ip',
    if: 'ctx.destination?.ip != null',
  },
];

export const relatedExpectedHandlerResponse = {
  currentPipeline: {
    description: 'Pipeline to process mysql_enterprise audit logs',
    processors: [
      {
        set: {
          field: 'ecs.version',
          value: '8.11.0',
        },
      },
      {
        append: {
          field: 'related.user',
          value: '{{{source.user.id}}}',
          allow_duplicates: false,
          if: 'ctx.source?.user?.id != null',
        },
      },
      {
        append: {
          field: 'related.ip',
          value: '{{{destination.ip}}}',
          allow_duplicates: false,
          if: 'ctx.destination?.ip != null',
        },
      },
      {
        rename: {
          field: 'message',
          target_field: 'event.original',
          ignore_missing: true,
          if: 'ctx.event?.original == null',
        },
      },
      {
        remove: {
          field: 'event.original',
          tag: 'remove_original_event',
          if: 'ctx?.tags == null || !(ctx.tags.contains("preserve_original_event"))',
          ignore_failure: true,
          ignore_missing: true,
        },
      },
    ],
  },
  currentProcessors: [
    {
      field: 'related.ip',
      value_field: 'source.ip',
    },
    {
      field: 'related.ip',
      value_field: 'destination.ip',
      if: 'ctx.destination?.ip != null',
    },
  ],
  reviewed: false,
  lastExecutedChain: 'error',
};
