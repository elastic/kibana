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
} from './merge_tools';
import type { FileWrapper, FileAnalysis } from './file_wrapper';

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

      const result = createMergedMappings(files);
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

      const result = createMergedMappings(files);
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

      const result = createMergedMappings(files);
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

      const result = createMergedMappings(files);
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

      const result = createMergedMappings(files);

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

      const result = getMappingClashInfo(mappingClashes, filesStatus);

      expect(result).toEqual([
        { fileName: 'file1', clash: true, clashType: CLASH_TYPE.MAPPING },
        { fileName: 'file2', clash: false, clashType: CLASH_TYPE.MAPPING },
        { fileName: 'file3', clash: false, clashType: CLASH_TYPE.MAPPING },
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
        { fileName: 'file1', clash: false },
        { fileName: 'file2', clash: false },
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
        { fileName: 'file1', clash: true, clashType: CLASH_TYPE.FORMAT },
        { fileName: 'file2', clash: true, clashType: CLASH_TYPE.FORMAT },
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
        { fileName: 'file1', clash: false, clashType: undefined },
        { fileName: 'file2', clash: false, clashType: undefined },
        { fileName: 'file3', clash: true, clashType: 1 },
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
        { fileName: 'file1', clash: false, clashType: undefined },
        { fileName: 'file2', clash: false, clashType: undefined },
        { fileName: 'file3', clash: true, clashType: CLASH_TYPE.UNSUPPORTED },
      ]);
    });
  });
});
