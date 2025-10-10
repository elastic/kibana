/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createMergedMappings,
  getMappingClashInfo,
  getFormatClashes,
  CLASH_TYPE,
  CLASH_ERROR_TYPE,
  getFieldsFromMappings,
} from './merge_tools';
import type { FileWrapper, FileAnalysis } from './file_wrapper';
import type { FindFileStructureResponse } from '@kbn/file-upload-common';

describe('merge_tools', () => {
  describe('createMergedMappings', () => {
    it('should return merged mappings when all mappings are the same', () => {
      const files = [
        {
          getMappings: () => ({ properties: { field1: { type: 'text' } } }),
        } as never as FileWrapper,
        {
          getMappings: () => ({ properties: { field1: { type: 'text' } } }),
        } as never as FileWrapper,
      ];

      const result = createMergedMappings(files, null);
      expect(result.mergedMappings).toEqual({ properties: { field1: { type: 'text' } } });
      expect(result.mappingClashes).toEqual([]);
    });

    it('should return merged mappings when a keyword mapping is being merged with a text mapping', () => {
      const files = [
        {
          getMappings: () => ({ properties: { field1: { type: 'text' } } }),
        } as never as FileWrapper,
        {
          getMappings: () => ({ properties: { field1: { type: 'keyword' } } }),
        } as never as FileWrapper,
      ];

      const result = createMergedMappings(files, null);
      expect(result.mergedMappings).toEqual({ properties: { field1: { type: 'text' } } });
      expect(result.mappingClashes).toEqual([]);
    });

    it('should return merged mappings when a text mapping is being merged with a keyword mapping', () => {
      const files = [
        {
          getMappings: () => ({ properties: { field1: { type: 'keyword' } } }),
        } as never as FileWrapper,
        {
          getMappings: () => ({ properties: { field1: { type: 'text' } } }),
        } as never as FileWrapper,
      ];

      const result = createMergedMappings(files, null);
      expect(result.mergedMappings).toEqual({ properties: { field1: { type: 'text' } } });
      expect(result.mappingClashes).toEqual([]);
    });

    it('should return mapping clashes when mappings are different', () => {
      const files = [
        {
          getFileName: () => 'file1',
          getMappings: () => ({ properties: { field1: { type: 'text' } } }),
        } as never as FileWrapper,
        {
          getFileName: () => 'file2',
          getMappings: () => ({ properties: { field1: { type: 'number' } } }),
        } as never as FileWrapper,
      ];

      const result = createMergedMappings(files, null);
      expect(result.mergedMappings).toEqual({ properties: { field1: { type: 'text' } } });
      expect(result.mappingClashes).toEqual([
        {
          fieldName: 'field1',
          existingType: 'text',
          clashingType: { fileName: 'file2', newType: 'number', fileIndex: 1 },
        },
      ]);
    });

    it('should return mapping clashes when first field doesn`t match the others', () => {
      const files = [
        {
          getFileName: () => 'file1',
          getMappings: () => ({ properties: { field1: { type: 'text' } } }),
        } as never as FileWrapper,
        {
          getFileName: () => 'file2',
          getMappings: () => ({ properties: { field1: { type: 'number' } } }),
        } as never as FileWrapper,
        {
          getFileName: () => 'file3',
          getMappings: () => ({ properties: { field1: { type: 'number' } } }),
        } as never as FileWrapper,
      ];

      const result = createMergedMappings(files, null);

      expect(result.mergedMappings).toEqual({ properties: { field1: { type: 'text' } } });
      expect(result.mappingClashes).toEqual([
        {
          fieldName: 'field1',
          existingType: 'text',
          clashingType: {
            fileName: 'file2',
            newType: 'number',
            fileIndex: 1,
          },
        },
        {
          fieldName: 'field1',
          existingType: 'text',
          clashingType: {
            fileName: 'file3',
            newType: 'number',
            fileIndex: 2,
          },
        },
      ]);
    });

    it('should handle existing index mappings with no clashes', () => {
      const files = [
        {
          getFileName: () => 'file1',
          getMappings: () => ({
            properties: { field1: { type: 'text' }, field3: { type: 'boolean' } },
          }),
        } as never as FileWrapper,
      ];

      const existingIndexMappings = {
        properties: { field1: { type: 'text' }, field2: { type: 'number' } },
      } as never as FindFileStructureResponse['mappings'];

      const result = createMergedMappings(files, existingIndexMappings);

      expect(result.mergedMappings).toEqual({
        properties: {
          field1: { type: 'text' },
          field2: { type: 'number' },
          field3: { type: 'boolean' },
        },
      });
      expect(result.mappingClashes).toEqual([]);
      expect(result.existingIndexChecks).toBeDefined();
      expect(result.existingIndexChecks?.existingFields.sort()).toEqual(
        ['field1', 'field2'].sort()
      );
      expect(result.existingIndexChecks?.newFieldsPerFile).toEqual([
        { fileName: 'file1', fileIndex: 0, fields: ['field3'] },
      ]);
      expect(result.existingIndexChecks?.commonFieldsPerFile).toEqual([
        { fileName: 'file1', fileIndex: 0, fields: ['field1'] },
      ]);
      expect(result.existingIndexChecks?.unmappedFieldsPerFile).toEqual([
        { fileName: 'file1', fileIndex: 0, fields: ['field2'] },
      ]);
      expect(result.existingIndexChecks?.mappingClashes).toEqual([]);
    });

    it('should handle existing index mappings with clashes', () => {
      const files = [
        {
          getFileName: () => 'file1',
          getMappings: () => ({ properties: { field1: { type: 'number' } } }),
        } as never as FileWrapper,
      ];

      const existingIndexMappings = {
        properties: { field1: { type: 'text' } },
      } as never as FindFileStructureResponse['mappings'];

      const result = createMergedMappings(files, existingIndexMappings);

      expect(result.mergedMappings).toEqual({
        properties: {
          field1: { type: 'text' },
        },
      });
      expect(result.mappingClashes).toEqual([
        {
          fieldName: 'field1',
          existingType: 'text',
          clashingType: { fileName: undefined, newType: 'number', fileIndex: 1 },
        },
      ]);
      expect(result.existingIndexChecks).toBeDefined();
      expect(result.existingIndexChecks?.mappingClashes).toEqual([
        {
          fieldName: 'field1',
          existingType: 'text',
          clashingType: { fileName: 'file1', newType: 'number', fileIndex: 0 },
        },
      ]);
    });

    it('should handle existing index mappings with text/keyword compatibility', () => {
      const files = [
        {
          getFileName: () => 'file1',
          getMappings: () => ({ properties: { field1: { type: 'keyword' } } }),
        } as never as FileWrapper,
      ];

      const existingIndexMappings = {
        properties: { field1: { type: 'text' } },
      } as never as FindFileStructureResponse['mappings'];

      const result = createMergedMappings(files, existingIndexMappings);

      expect(result.mergedMappings).toEqual({
        properties: {
          field1: { type: 'text' },
        },
      });
      expect(result.mappingClashes).toEqual([]);
      expect(result.existingIndexChecks).toBeDefined();
      expect(result.existingIndexChecks?.mappingClashes).toEqual([]);
    });
  });

  describe('getMappingClashInfo', () => {
    it('should return file clashes based on mapping clashes', () => {
      const mappingClashes = [
        {
          fieldName: 'field1',
          existingType: 'text',
          clashingType: {
            fileName: 'file2',
            newType: 'number',
            fileIndex: 1,
          },
        },
        {
          fieldName: 'field1',
          existingType: 'text',
          clashingType: {
            fileName: 'file3',
            newType: 'number',
            fileIndex: 2,
          },
        },
      ];

      const filesStatus = [
        { fileName: 'file1', supportedFormat: true } as FileAnalysis,
        { fileName: 'file2', supportedFormat: true } as FileAnalysis,
        { fileName: 'file3', supportedFormat: true } as FileAnalysis,
      ];

      const result = getMappingClashInfo(mappingClashes, undefined, filesStatus);

      expect(result).toEqual([
        { fileName: 'file1', clash: CLASH_ERROR_TYPE.ERROR, clashType: CLASH_TYPE.MAPPING },
        { fileName: 'file2', clash: CLASH_ERROR_TYPE.NONE, clashType: CLASH_TYPE.MAPPING },
        { fileName: 'file3', clash: CLASH_ERROR_TYPE.NONE, clashType: CLASH_TYPE.MAPPING },
      ]);
    });
  });

  describe('getFormatClashes', () => {
    it('should return no clashes when all formats are supported', () => {
      const files = [
        {
          getFormat: () => 'semi_structured_text',
          getFileName: () => 'file1',
          getStatus: () => ({ supportedFormat: true }),
        } as FileWrapper,
        {
          getFormat: () => 'semi_structured_text',
          getFileName: () => 'file2',
          getStatus: () => ({ supportedFormat: true }),
        } as FileWrapper,
      ];

      const result = getFormatClashes(files);
      expect(result).toEqual([
        { fileName: 'file1', clash: CLASH_ERROR_TYPE.NONE },
        { fileName: 'file2', clash: CLASH_ERROR_TYPE.NONE },
      ]);
    });

    it('should return format clashes when formats are different', () => {
      const files = [
        {
          getFormat: () => 'semi_structured_text',
          getFileName: () => 'file1',
          getStatus: () => ({ supportedFormat: true }),
        } as FileWrapper,
        {
          getFormat: () => 'delimited',
          getFileName: () => 'file2',
          getStatus: () => ({ supportedFormat: true }),
        } as FileWrapper,
      ];

      const result = getFormatClashes(files);
      expect(result).toEqual([
        { fileName: 'file1', clash: CLASH_ERROR_TYPE.ERROR, clashType: CLASH_TYPE.FORMAT },
        { fileName: 'file2', clash: CLASH_ERROR_TYPE.ERROR, clashType: CLASH_TYPE.FORMAT },
      ]);
    });

    it('should choose the correct file that clashes', () => {
      const files = [
        {
          getFormat: () => 'semi_structured_text',
          getFileName: () => 'file1',
          getStatus: () => ({ supportedFormat: true }),
        } as FileWrapper,
        {
          getFormat: () => 'semi_structured_text',
          getFileName: () => 'file2',
          getStatus: () => ({ supportedFormat: true }),
        } as FileWrapper,
        {
          getFormat: () => 'delimited',
          getFileName: () => 'file3',
          getStatus: () => ({ supportedFormat: true }),
        } as FileWrapper,
      ];

      const result = getFormatClashes(files);

      expect(result).toEqual([
        { fileName: 'file1', clash: CLASH_ERROR_TYPE.NONE, clashType: undefined },
        { fileName: 'file2', clash: CLASH_ERROR_TYPE.NONE, clashType: undefined },
        { fileName: 'file3', clash: CLASH_ERROR_TYPE.ERROR, clashType: 1 },
      ]);
    });

    it('should return unsupported format clashes', () => {
      const files = [
        {
          getFormat: () => 'semi_structured_text',
          getFileName: () => 'file1',
          getStatus: () => ({ supportedFormat: true }),
          getMappings: () => ({ properties: { field1: { type: 'text' } } }),
        } as unknown as FileWrapper,
        {
          getFormat: () => 'semi_structured_text',
          getFileName: () => 'file2',
          getStatus: () => ({ supportedFormat: true }),
          getMappings: () => ({ properties: { field1: { type: 'text' } } }),
        } as unknown as FileWrapper,
        {
          getFormat: () => 'unknown',
          getFileName: () => 'file3',
          getStatus: () => ({ supportedFormat: false }),
          getMappings: () => ({ properties: { field1: { type: 'text' } } }),
        } as unknown as FileWrapper,
      ];

      const result = getFormatClashes(files);

      expect(result).toEqual([
        { fileName: 'file1', clash: CLASH_ERROR_TYPE.NONE, clashType: undefined },
        { fileName: 'file2', clash: CLASH_ERROR_TYPE.NONE, clashType: undefined },
        { fileName: 'file3', clash: CLASH_ERROR_TYPE.ERROR, clashType: CLASH_TYPE.UNSUPPORTED },
      ]);
    });

    describe('getFieldsFromMappings', () => {
      it('should return an empty array for empty mappings', () => {
        const mappings = { properties: {} };
        expect(getFieldsFromMappings(mappings)).toEqual([]);
      });

      it('should handle mappings with no properties field', () => {
        const mappings = {};
        expect(getFieldsFromMappings(mappings as any)).toEqual([]);
      });

      it('should extract a single top-level field', () => {
        const mappings = {
          properties: {
            field1: { type: 'text' },
          },
        };
        expect(getFieldsFromMappings(mappings as any)).toEqual([
          { name: 'field1', value: { type: 'text' } },
        ]);
      });

      it('should extract multiple top-level fields and sort them', () => {
        const mappings = {
          properties: {
            field2: { type: 'keyword' },
            field1: { type: 'float' },
          },
        };
        expect(getFieldsFromMappings(mappings as any)).toEqual([
          { name: 'field1', value: { type: 'float' } },
          { name: 'field2', value: { type: 'keyword' } },
        ]);
      });

      it('should extract nested fields with dot notation', () => {
        const mappings = {
          properties: {
            parent: {
              properties: {
                child: { type: 'text' },
              },
            },
          },
        };
        expect(getFieldsFromMappings(mappings as any)).toEqual([
          { name: 'parent.child', value: { type: 'text' } },
        ]);
      });

      it('should extract a mix of top-level and nested fields and sort them', () => {
        const mappings = {
          properties: {
            field2: { type: 'keyword' },
            parent: {
              properties: {
                child2: { type: 'float' },
                child1: { type: 'text' },
              },
            },
            field1: { type: 'boolean' },
          },
        };
        expect(getFieldsFromMappings(mappings as any)).toEqual([
          { name: 'field1', value: { type: 'boolean' } },
          { name: 'field2', value: { type: 'keyword' } },
          { name: 'parent.child1', value: { type: 'text' } },
          { name: 'parent.child2', value: { type: 'float' } },
        ]);
      });

      it('should filter fields by a single allowed type', () => {
        const mappings = {
          properties: {
            field1: { type: 'text' },
            field2: { type: 'keyword' },
            field3: { type: 'float' },
          },
        };
        expect(getFieldsFromMappings(mappings as any, ['text'])).toEqual([
          { name: 'field1', value: { type: 'text' } },
        ]);
      });

      it('should filter fields by multiple allowed types and sort them', () => {
        const mappings = {
          properties: {
            field1: { type: 'text' },
            field2: { type: 'keyword' },
            field3: { type: 'float' },
          },
        };
        expect(getFieldsFromMappings(mappings as any, ['float', 'text'])).toEqual([
          { name: 'field1', value: { type: 'text' } },
          { name: 'field3', value: { type: 'float' } },
        ]);
      });

      it('should return an empty array when allowed types do not match any field', () => {
        const mappings = {
          properties: {
            field1: { type: 'text' },
            field2: { type: 'keyword' },
          },
        };
        expect(getFieldsFromMappings(mappings as any, ['float'])).toEqual([]);
      });
    });
  });
});
