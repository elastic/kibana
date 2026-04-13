/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessingSimulationResponse } from '@kbn/streams-schema';
import { buildSimulationFeedback, detectTemporaryFields } from './build_simulation_feedback';

const stubGetFieldSummary = jest
  .fn()
  .mockResolvedValue(['message (text) - 1 distinct value (`hello`)']);

const stubFieldsMetadataClient = {
  find: jest.fn().mockResolvedValue({ getFields: () => ({}) }),
} as any;

const emptyDocumentsMetrics: ProcessingSimulationResponse['documents_metrics'] = {
  parsed_rate: 1,
  failed_rate: 0,
  partially_parsed_rate: 0,
  skipped_rate: 0,
  dropped_rate: 0,
};

const baseParams = {
  fieldsMetadataClient: stubFieldsMetadataClient,
  isOtel: false,
  mappedFields: {},
  getFieldSummary: stubGetFieldSummary,
};

describe('detectTemporaryFields', () => {
  it('detects custom.* fields', () => {
    const docs = [{ message: 'hello', 'custom.timestamp': '2024-01-01' }];
    expect(detectTemporaryFields(docs as any)).toMatchSnapshot();
  });

  it('detects attributes.custom.* fields', () => {
    const docs = [{ message: 'hello', 'attributes.custom.level': 'INFO' }];
    expect(detectTemporaryFields(docs as any)).toMatchSnapshot();
  });

  it('returns empty array when no temporary fields', () => {
    const docs = [{ message: 'hello', '@timestamp': '2024-01-01' }];
    expect(detectTemporaryFields(docs as any)).toEqual([]);
  });

  it('deduplicates and sorts', () => {
    const docs = [
      { 'custom.b': 'x', 'custom.a': 'y' },
      { 'custom.a': 'z', 'attributes.custom.c': 'w' },
    ];
    expect(detectTemporaryFields(docs as any)).toMatchSnapshot();
  });
});

describe('buildSimulationFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns invalid feedback when definition_error is present', async () => {
    const simulationResult: ProcessingSimulationResponse = {
      documents: [],
      detected_fields: [],
      processors_metrics: {},
      definition_error: { message: 'bad pipeline', type: 'definition' },
      documents_metrics: { ...emptyDocumentsMetrics },
    };

    const feedback = await buildSimulationFeedback({
      simulationResult,
      ...baseParams,
    });

    expect(feedback).toMatchSnapshot();
  });

  it('returns valid feedback when all processors pass', async () => {
    const simulationResult: ProcessingSimulationResponse = {
      documents: [
        {
          value: { message: 'ok' },
          errors: [],
          detected_fields: [],
          status: 'parsed',
          processed_by: ['root.steps[0]'],
        },
      ],
      detected_fields: [],
      processors_metrics: {
        'root.steps[0]': {
          parsed_rate: 1,
          failed_rate: 0,
          partially_parsed_rate: 0,
          skipped_rate: 0,
          dropped_rate: 0,
        },
      },
      definition_error: undefined,
      documents_metrics: { ...emptyDocumentsMetrics },
    };

    const feedback = await buildSimulationFeedback({
      simulationResult,
      ...baseParams,
    });

    expect(feedback).toMatchSnapshot();
  });

  it('reports per-processor failure rates when above 20%', async () => {
    const simulationResult: ProcessingSimulationResponse = {
      documents: [
        {
          value: { message: 'ok' },
          errors: [{ type: 'generic_processor_failure', message: 'bad pattern' }],
          detected_fields: [],
          status: 'error',
          processed_by: ['root.steps[0]'],
        },
      ],
      detected_fields: [],
      processors_metrics: {
        'root.steps[0]': {
          parsed_rate: 0,
          failed_rate: 1,
          partially_parsed_rate: 0,
          skipped_rate: 0,
          dropped_rate: 0,
        },
      },
      definition_error: undefined,
      documents_metrics: {
        parsed_rate: 0,
        failed_rate: 1,
        partially_parsed_rate: 0,
        skipped_rate: 0,
        dropped_rate: 0,
      },
    };

    const feedback = await buildSimulationFeedback({
      simulationResult,
      ...baseParams,
    });

    expect(feedback).toMatchSnapshot();
  });

  it('reports temporary fields and marks invalid', async () => {
    const simulationResult: ProcessingSimulationResponse = {
      documents: [
        {
          value: { message: 'ok', 'custom.timestamp': '2024-01-01' },
          errors: [],
          detected_fields: [],
          status: 'parsed',
          processed_by: [],
        },
      ],
      detected_fields: [],
      processors_metrics: {},
      definition_error: undefined,
      documents_metrics: { ...emptyDocumentsMetrics },
    };

    const feedback = await buildSimulationFeedback({
      simulationResult,
      ...baseParams,
    });

    expect(feedback).toMatchSnapshot();
  });

  it('includes per-processor top_errors with attribution', async () => {
    const simulationResult: ProcessingSimulationResponse = {
      documents: [
        {
          value: { message: 'fail' },
          errors: [{ type: 'generic_processor_failure', message: 'Text could not be parsed' }],
          detected_fields: [],
          status: 'error',
          processed_by: ['root.steps[0]'],
        },
        {
          value: { message: 'fail2' },
          errors: [{ type: 'generic_processor_failure', message: 'Text could not be parsed' }],
          detected_fields: [],
          status: 'error',
          processed_by: ['root.steps[0]'],
        },
      ],
      detected_fields: [],
      processors_metrics: {
        'root.steps[0]': {
          parsed_rate: 0,
          failed_rate: 1,
          partially_parsed_rate: 0,
          skipped_rate: 0,
          dropped_rate: 0,
        },
      },
      definition_error: undefined,
      documents_metrics: {
        parsed_rate: 0,
        failed_rate: 1,
        partially_parsed_rate: 0,
        skipped_rate: 0,
        dropped_rate: 0,
      },
    };

    const feedback = await buildSimulationFeedback({
      simulationResult,
      ...baseParams,
    });

    expect(feedback).toMatchSnapshot();
  });

  it('returns invalid feedback when simulation returns no documents', async () => {
    const simulationResult: ProcessingSimulationResponse = {
      documents: [],
      detected_fields: [],
      processors_metrics: {},
      definition_error: undefined,
      documents_metrics: { ...emptyDocumentsMetrics },
    };

    const feedback = await buildSimulationFeedback({
      simulationResult,
      ...baseParams,
    });

    expect(feedback).toMatchSnapshot();
  });
});
