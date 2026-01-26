/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SimulateIngestResponse } from '@elastic/elasticsearch/lib/api/types';
import type { FieldDefinition } from '@kbn/streams-schema';
import type { StreamlangDSL } from '@kbn/streamlang';
import {
  computePipelineSimulationResult,
  SuccessfulPipelineSimulateResponse,
} from './simulation_handler';

describe('simulation_handler', () => {
  describe('computePipelineSimulationResult', () => {
    describe('finalDetectedFields', () => {
      it('should not include temporary fields that are added and then removed', () => {
        // This test verifies the fix for https://github.com/elastic/kibana/issues/248968
        // When a field is added by one processor and then removed by another,
        // it should NOT appear in finalDetectedFields since it doesn't exist in the final output.

        const sampleDocs = [{ _source: { message: 'hello world' } }];

        // Processing DSL that adds a temp field and then removes it
        const processing: StreamlangDSL = {
          steps: [
            { action: 'set', customIdentifier: 'proc1', to: 'temp_field', value: 'temporary' },
            { action: 'remove', customIdentifier: 'proc2', from: 'temp_field' },
          ],
        };

        // Pipeline simulation shows the field being added in proc1, then removed in proc2
        const pipelineSimulationResult: SuccessfulPipelineSimulateResponse = {
          docs: [
            {
              processor_results: [
                {
                  processor_type: 'set',
                  tag: 'proc1',
                  status: 'success',
                  doc: {
                    _index: 'test',
                    _id: '0',
                    _version: '-3',
                    _source: { message: 'hello world', temp_field: 'temporary' },
                    _ingest: { timestamp: '2024-01-01T00:00:00.000Z', pipeline: '_simulate_pipeline' },
                  },
                },
                {
                  processor_type: 'remove',
                  tag: 'proc2',
                  status: 'success',
                  doc: {
                    _index: 'test',
                    _id: '0',
                    _version: '-3',
                    _source: { message: 'hello world' }, // temp_field removed
                    _ingest: { timestamp: '2024-01-01T00:00:00.000Z', pipeline: '_simulate_pipeline' },
                  },
                },
              ],
            },
          ],
        };

        const ingestSimulationResult: SimulateIngestResponse = {
          docs: [
            {
              doc: {
                _index: 'test',
                _id: '0',
                _source: { message: 'hello world' },
                executed_pipelines: ['_simulate_pipeline'],
              },
            },
          ],
        };

        const streamFields: FieldDefinition = {};

        const result = computePipelineSimulationResult(
          pipelineSimulationResult,
          ingestSimulationResult,
          sampleDocs,
          processing,
          false, // isWiredStream
          false, // otelStream
          streamFields
        );

        // temp_field should NOT be in finalDetectedFields since it was removed
        expect(result.finalDetectedFields).not.toContain('temp_field');
        expect(result.finalDetectedFields).toHaveLength(0);

        // However, the per-processor metrics should still track the field for proc1
        expect(result.processorsMetrics.proc1.detected_fields).toContain('temp_field');
      });

      it('should include fields that are added and persist in the final output', () => {
        const sampleDocs = [{ _source: { message: 'hello world' } }];

        const processing: StreamlangDSL = {
          steps: [
            { action: 'set', customIdentifier: 'proc1', to: 'new_field', value: 'permanent' },
          ],
        };

        const pipelineSimulationResult: SuccessfulPipelineSimulateResponse = {
          docs: [
            {
              processor_results: [
                {
                  processor_type: 'set',
                  tag: 'proc1',
                  status: 'success',
                  doc: {
                    _index: 'test',
                    _id: '0',
                    _version: '-3',
                    _source: { message: 'hello world', new_field: 'permanent' },
                    _ingest: { timestamp: '2024-01-01T00:00:00.000Z', pipeline: '_simulate_pipeline' },
                  },
                },
              ],
            },
          ],
        };

        const ingestSimulationResult: SimulateIngestResponse = {
          docs: [
            {
              doc: {
                _index: 'test',
                _id: '0',
                _source: { message: 'hello world', new_field: 'permanent' },
                executed_pipelines: ['_simulate_pipeline'],
              },
            },
          ],
        };

        const streamFields: FieldDefinition = {};

        const result = computePipelineSimulationResult(
          pipelineSimulationResult,
          ingestSimulationResult,
          sampleDocs,
          processing,
          false,
          false,
          streamFields
        );

        // new_field should be in finalDetectedFields since it exists in the final output
        expect(result.finalDetectedFields).toContain('new_field');
        expect(result.finalDetectedFields).toHaveLength(1);
      });

      it('should include updated fields in finalDetectedFields', () => {
        const sampleDocs = [{ _source: { message: 'hello world' } }];

        const processing: StreamlangDSL = {
          steps: [
            { action: 'set', customIdentifier: 'proc1', to: 'message', value: 'goodbye world' },
          ],
        };

        const pipelineSimulationResult: SuccessfulPipelineSimulateResponse = {
          docs: [
            {
              processor_results: [
                {
                  processor_type: 'set',
                  tag: 'proc1',
                  status: 'success',
                  doc: {
                    _index: 'test',
                    _id: '0',
                    _version: '-3',
                    _source: { message: 'goodbye world' },
                    _ingest: { timestamp: '2024-01-01T00:00:00.000Z', pipeline: '_simulate_pipeline' },
                  },
                },
              ],
            },
          ],
        };

        const ingestSimulationResult: SimulateIngestResponse = {
          docs: [
            {
              doc: {
                _index: 'test',
                _id: '0',
                _source: { message: 'goodbye world' },
                executed_pipelines: ['_simulate_pipeline'],
              },
            },
          ],
        };

        const streamFields: FieldDefinition = {};

        const result = computePipelineSimulationResult(
          pipelineSimulationResult,
          ingestSimulationResult,
          sampleDocs,
          processing,
          false,
          false,
          streamFields
        );

        // message should be in finalDetectedFields since its value changed
        expect(result.finalDetectedFields).toContain('message');
        expect(result.finalDetectedFields).toHaveLength(1);
      });

      it('should handle multiple temporary fields added and removed across multiple processors', () => {
        const sampleDocs = [{ _source: { original: 'data' } }];

        const processing: StreamlangDSL = {
          steps: [
            { action: 'set', customIdentifier: 'proc1', to: 'temp1', value: 'temp_value_1' },
            { action: 'set', customIdentifier: 'proc2', to: 'temp2', value: 'temp_value_2' },
            { action: 'set', customIdentifier: 'proc3', to: 'final_field', value: 'final_value' },
            { action: 'remove', customIdentifier: 'proc4', from: 'temp1' },
            { action: 'remove', customIdentifier: 'proc5', from: 'temp2' },
          ],
        };

        const pipelineSimulationResult: SuccessfulPipelineSimulateResponse = {
          docs: [
            {
              processor_results: [
                {
                  processor_type: 'set',
                  tag: 'proc1',
                  status: 'success',
                  doc: {
                    _index: 'test',
                    _id: '0',
                    _version: '-3',
                    _source: { original: 'data', temp1: 'temp_value_1' },
                    _ingest: { timestamp: '2024-01-01T00:00:00.000Z', pipeline: '_simulate_pipeline' },
                  },
                },
                {
                  processor_type: 'set',
                  tag: 'proc2',
                  status: 'success',
                  doc: {
                    _index: 'test',
                    _id: '0',
                    _version: '-3',
                    _source: { original: 'data', temp1: 'temp_value_1', temp2: 'temp_value_2' },
                    _ingest: { timestamp: '2024-01-01T00:00:00.000Z', pipeline: '_simulate_pipeline' },
                  },
                },
                {
                  processor_type: 'set',
                  tag: 'proc3',
                  status: 'success',
                  doc: {
                    _index: 'test',
                    _id: '0',
                    _version: '-3',
                    _source: {
                      original: 'data',
                      temp1: 'temp_value_1',
                      temp2: 'temp_value_2',
                      final_field: 'final_value',
                    },
                    _ingest: { timestamp: '2024-01-01T00:00:00.000Z', pipeline: '_simulate_pipeline' },
                  },
                },
                {
                  processor_type: 'remove',
                  tag: 'proc4',
                  status: 'success',
                  doc: {
                    _index: 'test',
                    _id: '0',
                    _version: '-3',
                    _source: {
                      original: 'data',
                      temp2: 'temp_value_2',
                      final_field: 'final_value',
                    },
                    _ingest: { timestamp: '2024-01-01T00:00:00.000Z', pipeline: '_simulate_pipeline' },
                  },
                },
                {
                  processor_type: 'remove',
                  tag: 'proc5',
                  status: 'success',
                  doc: {
                    _index: 'test',
                    _id: '0',
                    _version: '-3',
                    _source: { original: 'data', final_field: 'final_value' },
                    _ingest: { timestamp: '2024-01-01T00:00:00.000Z', pipeline: '_simulate_pipeline' },
                  },
                },
              ],
            },
          ],
        };

        const ingestSimulationResult: SimulateIngestResponse = {
          docs: [
            {
              doc: {
                _index: 'test',
                _id: '0',
                _source: { original: 'data', final_field: 'final_value' },
                executed_pipelines: ['_simulate_pipeline'],
              },
            },
          ],
        };

        const streamFields: FieldDefinition = {};

        const result = computePipelineSimulationResult(
          pipelineSimulationResult,
          ingestSimulationResult,
          sampleDocs,
          processing,
          false,
          false,
          streamFields
        );

        // Only final_field should be in finalDetectedFields
        expect(result.finalDetectedFields).toContain('final_field');
        expect(result.finalDetectedFields).not.toContain('temp1');
        expect(result.finalDetectedFields).not.toContain('temp2');
        expect(result.finalDetectedFields).toHaveLength(1);

        // Per-processor metrics should still track all detected fields
        expect(result.processorsMetrics.proc1.detected_fields).toContain('temp1');
        expect(result.processorsMetrics.proc2.detected_fields).toContain('temp2');
        expect(result.processorsMetrics.proc3.detected_fields).toContain('final_field');
      });

      it('should handle nested fields correctly', () => {
        const sampleDocs = [{ _source: { data: { nested: 'original' } } }];

        const processing: StreamlangDSL = {
          steps: [
            { action: 'set', customIdentifier: 'proc1', to: 'data.temp', value: 'temporary' },
            { action: 'set', customIdentifier: 'proc2', to: 'data.permanent', value: 'keep me' },
            { action: 'remove', customIdentifier: 'proc3', from: 'data.temp' },
          ],
        };

        const pipelineSimulationResult: SuccessfulPipelineSimulateResponse = {
          docs: [
            {
              processor_results: [
                {
                  processor_type: 'set',
                  tag: 'proc1',
                  status: 'success',
                  doc: {
                    _index: 'test',
                    _id: '0',
                    _version: '-3',
                    _source: { data: { nested: 'original', temp: 'temporary' } },
                    _ingest: { timestamp: '2024-01-01T00:00:00.000Z', pipeline: '_simulate_pipeline' },
                  },
                },
                {
                  processor_type: 'set',
                  tag: 'proc2',
                  status: 'success',
                  doc: {
                    _index: 'test',
                    _id: '0',
                    _version: '-3',
                    _source: { data: { nested: 'original', temp: 'temporary', permanent: 'keep me' } },
                    _ingest: { timestamp: '2024-01-01T00:00:00.000Z', pipeline: '_simulate_pipeline' },
                  },
                },
                {
                  processor_type: 'remove',
                  tag: 'proc3',
                  status: 'success',
                  doc: {
                    _index: 'test',
                    _id: '0',
                    _version: '-3',
                    _source: { data: { nested: 'original', permanent: 'keep me' } },
                    _ingest: { timestamp: '2024-01-01T00:00:00.000Z', pipeline: '_simulate_pipeline' },
                  },
                },
              ],
            },
          ],
        };

        const ingestSimulationResult: SimulateIngestResponse = {
          docs: [
            {
              doc: {
                _index: 'test',
                _id: '0',
                _source: { data: { nested: 'original', permanent: 'keep me' } },
                executed_pipelines: ['_simulate_pipeline'],
              },
            },
          ],
        };

        const streamFields: FieldDefinition = {};

        const result = computePipelineSimulationResult(
          pipelineSimulationResult,
          ingestSimulationResult,
          sampleDocs,
          processing,
          false,
          false,
          streamFields
        );

        // data.permanent should be detected, data.temp should not
        expect(result.finalDetectedFields).toContain('data.permanent');
        expect(result.finalDetectedFields).not.toContain('data.temp');
        expect(result.finalDetectedFields).toHaveLength(1);
      });

      it('should aggregate detected fields across multiple documents', () => {
        const sampleDocs = [
          { _source: { message: 'doc1' } },
          { _source: { message: 'doc2' } },
        ];

        const processing: StreamlangDSL = {
          steps: [
            { action: 'set', customIdentifier: 'proc1', to: 'field_a', value: 'value_a' },
          ],
        };

        const pipelineSimulationResult: SuccessfulPipelineSimulateResponse = {
          docs: [
            {
              processor_results: [
                {
                  processor_type: 'set',
                  tag: 'proc1',
                  status: 'success',
                  doc: {
                    _index: 'test',
                    _id: '0',
                    _version: '-3',
                    _source: { message: 'doc1', field_a: 'value_a' },
                    _ingest: { timestamp: '2024-01-01T00:00:00.000Z', pipeline: '_simulate_pipeline' },
                  },
                },
              ],
            },
            {
              processor_results: [
                {
                  processor_type: 'set',
                  tag: 'proc1',
                  status: 'success',
                  doc: {
                    _index: 'test',
                    _id: '1',
                    _version: '-3',
                    _source: { message: 'doc2', field_a: 'value_a', field_b: 'value_b' },
                    _ingest: { timestamp: '2024-01-01T00:00:00.000Z', pipeline: '_simulate_pipeline' },
                  },
                },
              ],
            },
          ],
        };

        const ingestSimulationResult: SimulateIngestResponse = {
          docs: [
            {
              doc: {
                _index: 'test',
                _id: '0',
                _source: { message: 'doc1', field_a: 'value_a' },
                executed_pipelines: ['_simulate_pipeline'],
              },
            },
            {
              doc: {
                _index: 'test',
                _id: '1',
                _source: { message: 'doc2', field_a: 'value_a', field_b: 'value_b' },
                executed_pipelines: ['_simulate_pipeline'],
              },
            },
          ],
        };

        const streamFields: FieldDefinition = {};

        const result = computePipelineSimulationResult(
          pipelineSimulationResult,
          ingestSimulationResult,
          sampleDocs,
          processing,
          false,
          false,
          streamFields
        );

        // Both fields should be detected (field_a from both docs, field_b only from doc2)
        expect(result.finalDetectedFields).toContain('field_a');
        expect(result.finalDetectedFields).toContain('field_b');
        expect(result.finalDetectedFields).toHaveLength(2);
      });
    });
  });
});
