/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord, ProcessingSimulationResponse } from '@kbn/streams-schema';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { buildSimulationFeedback, detectTemporaryFields } from './build_simulation_feedback';

const stubGetFieldSummary = jest
  .fn()
  .mockResolvedValue(['message (text) - 1 distinct value (`hello`)']);

const stubFieldsMetadataClient = {
  find: jest.fn().mockResolvedValue({ getFields: () => ({}) }),
  getByName: jest.fn().mockResolvedValue(undefined),
  matchesAnyTypeForEventCategory: jest.fn().mockReturnValue(false),
  getFieldChildren: jest.fn().mockResolvedValue([]),
  getECSFieldsets: jest.fn().mockResolvedValue({}),
} satisfies IFieldsMetadataClient;

const emptyDocumentsMetrics: ProcessingSimulationResponse['documents_metrics'] = {
  parsed_rate: 1,
  failed_rate: 0,
  partially_parsed_rate: 0,
  skipped_rate: 0,
  dropped_rate: 0,
} as const;

const baseParams = {
  fieldsMetadataClient: stubFieldsMetadataClient,
  isOtel: false,
  mappedFields: {},
  getFieldSummary: stubGetFieldSummary,
};

describe('detectTemporaryFields', () => {
  it('detects custom.* fields', () => {
    const docs: FlattenRecord[] = [{ message: 'hello', 'custom.timestamp': '2024-01-01' }];
    expect(detectTemporaryFields(docs)).toMatchSnapshot();
  });

  it('detects attributes.custom.* fields', () => {
    const docs: FlattenRecord[] = [{ message: 'hello', 'attributes.custom.level': 'INFO' }];
    expect(detectTemporaryFields(docs)).toMatchSnapshot();
  });

  it('returns empty array when no temporary fields', () => {
    const docs: FlattenRecord[] = [{ message: 'hello', '@timestamp': '2024-01-01' }];
    expect(detectTemporaryFields(docs)).toEqual([]);
  });

  it('deduplicates and sorts', () => {
    const docs: FlattenRecord[] = [
      { 'custom.b': 'x', 'custom.a': 'y' },
      { 'custom.a': 'z', 'attributes.custom.c': 'w' },
    ];
    expect(detectTemporaryFields(docs)).toMatchSnapshot();
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
      definition_error: { message: 'bad pipeline', type: 'validation_error' },
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
          skipped_rate: 0,
          dropped_rate: 0,
          detected_fields: [],
          errors: [],
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
          errors: [
            {
              type: 'generic_processor_failure',
              message: 'bad pattern',
              processor_id: 'root.steps[0]',
            },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: ['root.steps[0]'],
        },
      ],
      detected_fields: [],
      processors_metrics: {
        'root.steps[0]': {
          parsed_rate: 0,
          failed_rate: 1,
          skipped_rate: 0,
          dropped_rate: 0,
          detected_fields: [],
          errors: [],
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

  it('reports temporary fields as informational without gating valid', async () => {
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
    expect(feedback.valid).toBe(true);
    expect(feedback.temporary_fields).toEqual(['custom.timestamp']);
  });

  it('includes per-processor top_errors with attribution', async () => {
    const simulationResult: ProcessingSimulationResponse = {
      documents: [
        {
          value: { message: 'fail' },
          errors: [
            {
              type: 'generic_processor_failure',
              message: 'Text could not be parsed',
              processor_id: 'root.steps[0]',
            },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: ['root.steps[0]'],
        },
        {
          value: { message: 'fail2' },
          errors: [
            {
              type: 'generic_processor_failure',
              message: 'Text could not be parsed',
              processor_id: 'root.steps[0]',
            },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: ['root.steps[0]'],
        },
      ],
      detected_fields: [],
      processors_metrics: {
        'root.steps[0]': {
          parsed_rate: 0,
          failed_rate: 1,
          skipped_rate: 0,
          dropped_rate: 0,
          detected_fields: [],
          errors: [],
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

  it('attributes errors using processor_id instead of processed_by', async () => {
    // 4-step pipeline where only steps[3] fails — errors should NOT spray to steps[0..2]
    const simulationResult: ProcessingSimulationResponse = {
      documents: Array.from({ length: 100 }, () => ({
        value: { message: 'ok' },
        errors: [
          {
            type: 'generic_processor_failure',
            message: 'field [resource.attributes.host.name] already exists',
            processor_id: 'root.steps[3]',
          },
        ],
        detected_fields: [],
        status: 'failed' as const,
        processed_by: ['root.steps[0]', 'root.steps[1]', 'root.steps[2]', 'root.steps[3]'],
      })),
      detected_fields: [],
      processors_metrics: {
        'root.steps[0]': {
          parsed_rate: 1,
          failed_rate: 0,
          skipped_rate: 0,
          dropped_rate: 0,
          detected_fields: [],
          errors: [],
        },
        'root.steps[1]': {
          parsed_rate: 1,
          failed_rate: 0,
          skipped_rate: 0,
          dropped_rate: 0,
          detected_fields: [],
          errors: [],
        },
        'root.steps[2]': {
          parsed_rate: 1,
          failed_rate: 0,
          skipped_rate: 0,
          dropped_rate: 0,
          detected_fields: [],
          errors: [],
        },
        'root.steps[3]': {
          parsed_rate: 0,
          failed_rate: 1,
          skipped_rate: 0,
          dropped_rate: 0,
          detected_fields: [],
          errors: [],
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

    // Only root.steps[3] should have top_errors — steps[0..2] should have empty top_errors
    expect(feedback.processors['root.steps[0]']?.top_errors).toEqual([]);
    expect(feedback.processors['root.steps[1]']?.top_errors).toEqual([]);
    expect(feedback.processors['root.steps[2]']?.top_errors).toEqual([]);
    expect(feedback.processors['root.steps[3]']?.top_errors.length).toBeGreaterThan(0);
  });

  it('falls back to processed_by for errors without processor_id', async () => {
    const simulationResult: ProcessingSimulationResponse = {
      documents: [
        {
          value: { message: 'fail' },
          errors: [
            {
              type: 'field_mapping_failure',
              message: 'Invalid format',
            },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: ['root.steps[0]'],
        },
      ],
      detected_fields: [],
      processors_metrics: {
        'root.steps[0]': {
          parsed_rate: 0,
          failed_rate: 1,
          skipped_rate: 0,
          dropped_rate: 0,
          detected_fields: [],
          errors: [],
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

    expect(feedback.processors['root.steps[0]']?.top_errors.length).toBeGreaterThan(0);
  });
});
