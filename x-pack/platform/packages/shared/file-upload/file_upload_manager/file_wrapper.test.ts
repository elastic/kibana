/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FileWrapper } from './file_wrapper';
import type { MappingTypeMapping, IngestPipeline } from '@elastic/elasticsearch/lib/api/types';

// Mock the dependencies
jest.mock('@kbn/file-upload-plugin/public/api');
jest.mock('@kbn/data-plugin/public');
jest.mock('./tika_utils');
jest.mock('./tika_analyzer');
jest.mock('./file_size_check');
jest.mock('../src/utils');
jest.mock('./doc_count_service');

Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn(() => 'test-uuid-1234567890'),
});

describe('FileWrapper', () => {
  let fileWrapper: FileWrapper;
  let mockFile: File;
  let mockFileUpload: any;
  let mockData: any;
  let mockTelemetryService: any;

  beforeEach(() => {
    mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' });
    mockFileUpload = {};
    mockData = {};
    mockTelemetryService = {};

    fileWrapper = new FileWrapper(
      mockFile,
      mockFileUpload,
      mockData,
      mockTelemetryService,
      'test-session-id'
    );
  });

  afterEach(() => {
    fileWrapper.destroy();
  });

  describe('updateDateField', () => {
    it('should remove date processors when field is no longer of type date', () => {
      const initialPipeline: IngestPipeline = {
        description: 'Test pipeline',
        processors: [
          {
            csv: {
              field: 'message',
              target_fields: ['time', 'name'],
            },
          },
          {
            date: {
              field: 'time',
              formats: ['yyyy-MM-dd HH:mm:ss'],
            },
          },
          {
            remove: {
              field: 'message',
            },
          },
        ],
      };

      const mappings: MappingTypeMapping = {
        properties: {
          time: { type: 'text' }, // Changed from date to text
          name: { type: 'keyword' },
        },
      };

      fileWrapper.setPipeline(initialPipeline);
      fileWrapper.updateDateField(mappings);

      const updatedPipeline = fileWrapper.getPipeline();
      expect(updatedPipeline?.processors).toHaveLength(2);
      expect(updatedPipeline?.processors!.find((p) => p.date)).toBeUndefined();
    });

    it('should replace date processors when field format does not match', () => {
      const initialPipeline: IngestPipeline = {
        description: 'Test pipeline',
        processors: [
          {
            date: {
              field: 'timestamp',
              formats: ['yyyy-MM-dd HH:mm:ss'],
            },
          },
        ],
      };

      const mappings: MappingTypeMapping = {
        properties: {
          timestamp: {
            type: 'date',
            format: 'yyyy/MM/dd', // Different format
          },
        },
      };

      fileWrapper.setPipeline(initialPipeline);
      fileWrapper.updateDateField(mappings);

      const updatedPipeline = fileWrapper.getPipeline();
      expect(updatedPipeline?.processors).toEqual([
        { date: { field: 'timestamp', formats: ['yyyy/MM/dd'] } },
      ]);
    });

    it('should keep date processors when field type and format match', () => {
      const initialPipeline: IngestPipeline = {
        description: 'Test pipeline',
        processors: [
          {
            date: {
              field: 'timestamp',
              formats: ['yyyy-MM-dd HH:mm:ss'],
            },
          },
        ],
      };

      const mappings: MappingTypeMapping = {
        properties: {
          timestamp: {
            type: 'date',
            format: 'yyyy-MM-dd HH:mm:ss',
          },
        },
      };

      fileWrapper.setPipeline(initialPipeline);
      fileWrapper.updateDateField(mappings);

      const updatedPipeline = fileWrapper.getPipeline();
      expect(updatedPipeline?.processors).toHaveLength(1);
      expect(updatedPipeline?.processors![0].date?.field).toBe('timestamp');
    });

    it('should add new date processors for date fields with formats', () => {
      const initialPipeline: IngestPipeline = {
        description: 'Test pipeline',
        processors: [
          {
            csv: {
              field: 'message',
              target_fields: ['time', 'name'],
            },
          },
          {
            remove: {
              field: 'message',
            },
          },
        ],
      };

      const mappings: MappingTypeMapping = {
        properties: {
          time: {
            type: 'date',
            format: 'yyyy-MM-dd HH:mm:ss',
          },
          created_at: {
            type: 'date',
            format: 'ISO8601',
          },
          name: { type: 'keyword' },
        },
      };

      fileWrapper.setPipeline(initialPipeline);
      fileWrapper.updateDateField(mappings);

      const updatedPipeline = fileWrapper.getPipeline();
      expect(updatedPipeline?.processors).toHaveLength(4); // csv + 2 new date + remove

      const dateProcessors = updatedPipeline?.processors!.filter((p) => p.date);
      expect(dateProcessors).toHaveLength(2);

      const timeProcessor = dateProcessors?.find((p) => p.date?.field === 'time');
      const createdAtProcessor = dateProcessors?.find((p) => p.date?.field === 'created_at');

      expect(timeProcessor?.date?.formats).toEqual(['yyyy-MM-dd HH:mm:ss']);
      expect(createdAtProcessor?.date?.formats).toEqual(['ISO8601']);

      // Check that remove processor is still last
      const lastProcessor = updatedPipeline?.processors![updatedPipeline.processors!.length - 1];
      expect(lastProcessor?.remove).toBeDefined();
    });

    it('should handle array formats in mappings', () => {
      const initialPipeline: IngestPipeline = {
        description: 'Test pipeline',
        processors: [],
      };

      const mappings: MappingTypeMapping = {
        properties: {
          timestamp: {
            type: 'date',
            format: 'yyyy-MM-dd HH:mm:ss',
          },
        },
      };

      fileWrapper.setPipeline(initialPipeline);
      fileWrapper.updateDateField(mappings);

      const updatedPipeline = fileWrapper.getPipeline();
      const dateProcessor = updatedPipeline?.processors!.find((p) => p.date);

      expect(dateProcessor?.date?.formats).toEqual(['yyyy-MM-dd HH:mm:ss']);
    });

    it('should not add duplicate date processors', () => {
      const initialPipeline: IngestPipeline = {
        description: 'Test pipeline',
        processors: [
          {
            date: {
              field: 'timestamp',
              formats: ['yyyy-MM-dd HH:mm:ss'],
            },
          },
        ],
      };

      const mappings: MappingTypeMapping = {
        properties: {
          timestamp: {
            type: 'date',
            format: 'yyyy-MM-dd HH:mm:ss',
          },
        },
      };

      fileWrapper.setPipeline(initialPipeline);
      fileWrapper.updateDateField(mappings);

      const updatedPipeline = fileWrapper.getPipeline();
      const dateProcessors = updatedPipeline?.processors!.filter((p) => p.date);
      expect(dateProcessors).toHaveLength(1);
    });

    it('should handle empty pipeline processors', () => {
      const initialPipeline: IngestPipeline = {
        description: 'Test pipeline',
        processors: [],
      };

      const mappings: MappingTypeMapping = {
        properties: {
          timestamp: {
            type: 'date',
            format: 'yyyy-MM-dd HH:mm:ss',
          },
        },
      };

      fileWrapper.setPipeline(initialPipeline);
      fileWrapper.updateDateField(mappings);

      const updatedPipeline = fileWrapper.getPipeline();
      expect(updatedPipeline?.processors).toHaveLength(1);
      expect(updatedPipeline?.processors![0].date?.field).toBe('timestamp');
    });

    it('should handle undefined pipeline', () => {
      const mappings: MappingTypeMapping = {
        properties: {
          timestamp: {
            type: 'date',
            format: 'yyyy-MM-dd HH:mm:ss',
          },
        },
      };

      fileWrapper.setPipeline(undefined);

      expect(() => {
        fileWrapper.updateDateField(mappings);
      }).not.toThrow();

      const updatedPipeline = fileWrapper.getPipeline();
      expect(updatedPipeline).toBeUndefined();
    });

    it('should handle empty mappings properties', () => {
      const initialPipeline: IngestPipeline = {
        description: 'Test pipeline',
        processors: [
          {
            date: {
              field: 'timestamp',
              formats: ['yyyy-MM-dd HH:mm:ss'],
            },
          },
        ],
      };

      const mappings: MappingTypeMapping = {
        properties: {},
      };

      fileWrapper.setPipeline(initialPipeline);
      fileWrapper.updateDateField(mappings);

      const updatedPipeline = fileWrapper.getPipeline();
      expect(updatedPipeline?.processors).toHaveLength(0);
    });
  });

  describe('renameTargetFields', () => {
    it('should rename target_fields in CSV processors', () => {
      const initialPipeline: IngestPipeline = {
        description: 'Test pipeline',
        processors: [
          {
            csv: {
              field: 'message',
              target_fields: ['old_field1', 'old_field2', 'unchanged_field'],
            },
          },
          {
            date: {
              field: 'old_field1',
              formats: ['yyyy-MM-dd HH:mm:ss'],
            },
          },
        ],
      };

      const changes = [
        { oldName: 'old_field1', newName: 'new_field1' },
        { oldName: 'old_field2', newName: 'new_field2' },
      ];

      fileWrapper.setPipeline(initialPipeline);
      fileWrapper.renameTargetFields(changes);

      const updatedPipeline = fileWrapper.getPipeline();
      const csvProcessor = updatedPipeline?.processors!.find((p) => p.csv);

      expect(csvProcessor?.csv?.target_fields).toEqual([
        'new_field1',
        'new_field2',
        'unchanged_field',
      ]);
    });

    it('should handle changes where oldName equals newName', () => {
      const initialPipeline: IngestPipeline = {
        description: 'Test pipeline',
        processors: [
          {
            csv: {
              field: 'message',
              target_fields: ['field1', 'field2'],
            },
          },
        ],
      };

      const changes = [
        { oldName: 'field1', newName: 'field1' }, // Same name
        { oldName: 'field2', newName: 'new_field2' },
      ];

      fileWrapper.setPipeline(initialPipeline);
      fileWrapper.renameTargetFields(changes);

      const updatedPipeline = fileWrapper.getPipeline();
      const csvProcessor = updatedPipeline?.processors!.find((p) => p.csv);

      expect(csvProcessor?.csv?.target_fields).toEqual(['field1', 'new_field2']);
    });

    it('should handle empty changes array', () => {
      const initialPipeline: IngestPipeline = {
        description: 'Test pipeline',
        processors: [
          {
            csv: {
              field: 'message',
              target_fields: ['field1', 'field2'],
            },
          },
        ],
      };

      fileWrapper.setPipeline(initialPipeline);
      fileWrapper.renameTargetFields([]);

      const updatedPipeline = fileWrapper.getPipeline();
      const csvProcessor = updatedPipeline?.processors!.find((p) => p.csv);

      expect(csvProcessor?.csv?.target_fields).toEqual(['field1', 'field2']);
    });

    it('should handle pipeline without CSV processors', () => {
      const initialPipeline: IngestPipeline = {
        description: 'Test pipeline',
        processors: [
          {
            date: {
              field: 'timestamp',
              formats: ['yyyy-MM-dd HH:mm:ss'],
            },
          },
        ],
      };

      const changes = [{ oldName: 'old_field', newName: 'new_field' }];

      fileWrapper.setPipeline(initialPipeline);
      fileWrapper.renameTargetFields(changes);

      const updatedPipeline = fileWrapper.getPipeline();
      expect(updatedPipeline?.processors).toHaveLength(1);
      expect(updatedPipeline?.processors![0].date).toBeDefined();
    });

    it('should handle undefined pipeline', () => {
      const changes = [{ oldName: 'old_field', newName: 'new_field' }];

      fileWrapper.setPipeline(undefined);

      expect(() => {
        fileWrapper.renameTargetFields(changes);
      }).not.toThrow();

      const updatedPipeline = fileWrapper.getPipeline();
      expect(updatedPipeline).toBeUndefined();
    });
  });

  describe('removeConvertProcessors', () => {
    it('should remove all convert processors', () => {
      const initialPipeline: IngestPipeline = {
        description: 'Test pipeline',
        processors: [
          {
            csv: {
              field: 'message',
              target_fields: ['field1', 'field2'],
            },
          },
          {
            convert: {
              field: 'field1',
              type: 'integer',
            },
          },
          {
            convert: {
              field: 'field2',
              type: 'boolean',
            },
          },
          {
            date: {
              field: 'timestamp',
              formats: ['yyyy-MM-dd HH:mm:ss'],
            },
          },
          {
            remove: {
              field: 'message',
            },
          },
        ],
      };

      fileWrapper.setPipeline(initialPipeline);
      fileWrapper.removeConvertProcessors();

      const updatedPipeline = fileWrapper.getPipeline();
      expect(updatedPipeline?.processors).toHaveLength(3); // csv + date + remove

      const convertProcessors = updatedPipeline?.processors!.filter((p) => p.convert);
      expect(convertProcessors).toHaveLength(0);

      // Verify other processors remain
      expect(updatedPipeline?.processors!.find((p) => p.csv)).toBeDefined();
      expect(updatedPipeline?.processors!.find((p) => p.date)).toBeDefined();
      expect(updatedPipeline?.processors!.find((p) => p.remove)).toBeDefined();
    });

    it('should handle pipeline without convert processors', () => {
      const initialPipeline: IngestPipeline = {
        description: 'Test pipeline',
        processors: [
          {
            csv: {
              field: 'message',
              target_fields: ['field1', 'field2'],
            },
          },
          {
            date: {
              field: 'timestamp',
              formats: ['yyyy-MM-dd HH:mm:ss'],
            },
          },
        ],
      };

      fileWrapper.setPipeline(initialPipeline);
      fileWrapper.removeConvertProcessors();

      const updatedPipeline = fileWrapper.getPipeline();
      expect(updatedPipeline?.processors).toHaveLength(2);
      expect(updatedPipeline?.processors!.find((p) => p.csv)).toBeDefined();
      expect(updatedPipeline?.processors!.find((p) => p.date)).toBeDefined();
    });

    it('should handle empty processors array', () => {
      const initialPipeline: IngestPipeline = {
        description: 'Test pipeline',
        processors: [],
      };

      fileWrapper.setPipeline(initialPipeline);
      fileWrapper.removeConvertProcessors();

      const updatedPipeline = fileWrapper.getPipeline();
      expect(updatedPipeline?.processors).toHaveLength(0);
    });

    it('should handle undefined pipeline', () => {
      fileWrapper.setPipeline(undefined);

      expect(() => {
        fileWrapper.removeConvertProcessors();
      }).not.toThrow();

      const updatedPipeline = fileWrapper.getPipeline();
      expect(updatedPipeline).toBeUndefined();
    });
  });
});
