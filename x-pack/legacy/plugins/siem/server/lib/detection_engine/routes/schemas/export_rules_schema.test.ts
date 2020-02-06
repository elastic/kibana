/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { exportRulesSchema, exportRulesQuerySchema } from './export_rules_schema';
import { ExportRulesRequest } from '../../rules/types';

describe('create rules schema', () => {
  describe('exportRulesSchema', () => {
    test('null value or absent values validate', () => {
      expect(exportRulesSchema.validate(null).error).toBeFalsy();
    });

    test('empty object does not validate', () => {
      expect(
        exportRulesSchema.validate<Partial<ExportRulesRequest['payload']>>({}).error
      ).toBeTruthy();
    });

    test('empty object array does validate', () => {
      expect(
        exportRulesSchema.validate<Partial<ExportRulesRequest['payload']>>({ objects: [] }).error
      ).toBeTruthy();
    });

    test('array with rule_id validates', () => {
      expect(
        exportRulesSchema.validate<Partial<ExportRulesRequest['payload']>>({
          objects: [{ rule_id: 'test-1' }],
        }).error
      ).toBeFalsy();
    });

    test('array with id does not validate as we do not allow that on purpose since we export rule_id', () => {
      expect(
        exportRulesSchema.validate<Omit<ExportRulesRequest['payload'], 'objects'>>({
          objects: [{ id: 'test-1' }],
        }).error.message
      ).toEqual(
        'child "objects" fails because ["objects" at position 0 fails because ["id" is not allowed]]'
      );
    });
  });

  describe('exportRulesQuerySchema', () => {
    test('default value for file_name is export.ndjson', () => {
      expect(
        exportRulesQuerySchema.validate<Partial<ExportRulesRequest['query']>>({}).value.file_name
      ).toEqual('export.ndjson');
    });

    test('default value for exclude_export_details is false', () => {
      expect(
        exportRulesQuerySchema.validate<Partial<ExportRulesRequest['query']>>({}).value
          .exclude_export_details
      ).toEqual(false);
    });

    test('file_name validates', () => {
      expect(
        exportRulesQuerySchema.validate<Partial<ExportRulesRequest['query']>>({
          file_name: 'test.ndjson',
        }).error
      ).toBeFalsy();
    });

    test('file_name does not validate with a number', () => {
      expect(
        exportRulesQuerySchema.validate<
          Partial<Omit<ExportRulesRequest['query'], 'file_name'> & { file_name: number }>
        >({
          file_name: 5,
        }).error.message
      ).toEqual('child "file_name" fails because ["file_name" must be a string]');
    });

    test('exclude_export_details validates with a boolean true', () => {
      expect(
        exportRulesQuerySchema.validate<Partial<ExportRulesRequest['query']>>({
          exclude_export_details: true,
        }).error
      ).toBeFalsy();
    });

    test('exclude_export_details does not validate with a weird string', () => {
      expect(
        exportRulesQuerySchema.validate<
          Partial<
            Omit<ExportRulesRequest['query'], 'exclude_export_details'> & {
              exclude_export_details: string;
            }
          >
        >({
          exclude_export_details: 'blah',
        }).error.message
      ).toEqual(
        'child "exclude_export_details" fails because ["exclude_export_details" must be a boolean]'
      );
    });
  });
});
