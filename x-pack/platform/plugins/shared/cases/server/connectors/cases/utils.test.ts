/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CaseCustomFields,
  CustomFieldConfiguration,
  CustomFieldsConfiguration,
} from '../../../common/types/domain';
import { CustomFieldTypes } from '../../../common/types/domain';
import { oracleRecordError, oracleRecord } from './index.mock';
import {
  convertValueToString,
  isRecordError,
  partitionRecordsByError,
  buildCustomFieldsForRequest,
  constructRequiredKibanaPrivileges,
} from './utils';

describe('utils', () => {
  describe('isRecordError', () => {
    it('returns true if the record contains an error', () => {
      expect(isRecordError(oracleRecordError)).toBe(true);
    });

    it('returns false if the record is an oracle record', () => {
      expect(isRecordError(oracleRecord)).toBe(false);
    });

    it('returns false if the record is an empty object', () => {
      // @ts-expect-error: need to test for empty objects
      expect(isRecordError({})).toBe(false);
    });
  });

  describe('partitionRecordsByError', () => {
    it('partition records correctly', () => {
      expect(
        partitionRecordsByError([oracleRecordError, oracleRecord, oracleRecordError, oracleRecord])
      ).toEqual([
        [oracleRecord, oracleRecord],
        [oracleRecordError, oracleRecordError],
      ]);
    });
  });

  describe('convertValueToString', () => {
    it('converts null correctly', () => {
      expect(convertValueToString(null)).toBe('');
    });

    it('converts undefined correctly', () => {
      expect(convertValueToString(undefined)).toBe('');
    });

    it('converts an array correctly', () => {
      expect(convertValueToString([1, 2, 'foo', { foo: 'bar' }])).toBe('[1,2,"foo",{"foo":"bar"}]');
    });

    it('converts an object correctly', () => {
      expect(convertValueToString({ foo: 'bar', baz: 2, qux: [1, 2, 'foo'] })).toBe(
        '{"foo":"bar","baz":2,"qux":[1,2,"foo"]}'
      );
    });

    it('converts a number correctly', () => {
      expect(convertValueToString(5.2)).toBe('5.2');
    });

    it('converts a string correctly', () => {
      expect(convertValueToString('foo')).toBe('foo');
    });

    it('converts a boolean correctly', () => {
      expect(convertValueToString(true)).toBe('true');
    });
  });

  describe('buildCustomFieldsForRequest', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('adds required custom fields with default values in configuration', () => {
      const customFieldsConfiguration: CustomFieldsConfiguration = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          label: 'text',
          required: true,
          defaultValue: 'default value',
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'toggle',
          required: true,
          defaultValue: true,
        },
      ];

      expect(buildCustomFieldsForRequest(customFieldsConfiguration)).toEqual([
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT as const,
          value: 'default value',
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE as const,
          value: true,
        },
      ]);
    });

    it('adds required custom fields without default values in configuration', () => {
      const customFieldsConfiguration: CustomFieldsConfiguration = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          label: 'text',
          required: true,
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'toggle',
          required: true,
        },
      ];

      expect(buildCustomFieldsForRequest(customFieldsConfiguration)).toEqual([
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT as const,
          value: 'N/A',
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE as const,
          value: false,
        },
      ]);
    });

    it('does not add optional fields with or without default values in configuration', () => {
      const customFieldsConfiguration: CustomFieldsConfiguration = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          label: 'text 1',
          required: false,
          defaultValue: 'default value',
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'toggle 1',
          required: false,
          defaultValue: false,
        },
        {
          key: 'third_key',
          type: CustomFieldTypes.TEXT,
          label: 'text 2',
          required: false,
        },
        {
          key: 'fourth_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'toggle 2',
          required: false,
        },
      ];

      expect(buildCustomFieldsForRequest(customFieldsConfiguration)).toEqual([]);
    });

    it('handles correctly a mix of required and optional custom fields', () => {
      const customFieldsConfiguration: CustomFieldsConfiguration = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          label: 'text 1',
          required: false,
          defaultValue: 'default value',
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'toggle 1',
          required: false,
          defaultValue: false,
        },
        {
          key: 'third_key',
          type: CustomFieldTypes.TEXT,
          label: 'text 2',
          required: true,
        },
        {
          key: 'fourth_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'toggle 2',
          required: false,
        },
      ];

      expect(buildCustomFieldsForRequest(customFieldsConfiguration)).toEqual([
        {
          key: 'third_key',
          type: CustomFieldTypes.TEXT,
          value: 'N/A',
        },
      ]);
    });

    it('ensure we can generate for every possible custom field type', () => {
      // this test should fail if a new custom field is added and the builder is not updated
      const customFieldsConfiguration: CustomFieldsConfiguration = Object.keys(
        CustomFieldTypes
      ).map(
        (type) =>
          ({
            key: `key-${type}`,
            type,
            label: `label-${type}`,
            required: true,
            // missing default value
          } as CustomFieldConfiguration)
      );

      expect(buildCustomFieldsForRequest(customFieldsConfiguration).length).toEqual(
        customFieldsConfiguration.length
      );
    });

    it('ensure template text custom fields are built correctly', () => {
      const customFieldsConfiguration: CustomFieldsConfiguration = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          label: 'text 1',
          required: false,
          defaultValue: 'default value',
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TEXT,
          label: 'text 2',
          required: true,
          defaultValue: 'default value second',
        },
        {
          key: 'third_key',
          type: CustomFieldTypes.TEXT,
          label: 'text 3',
          required: true,
        },
        {
          key: 'fourth_key',
          type: CustomFieldTypes.TEXT,
          label: 'text 4',
          required: false,
        },
      ];

      const templateCustomFields: CaseCustomFields = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          value: 'test value',
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TEXT,
          value: null,
        },
        {
          key: 'third_key',
          type: CustomFieldTypes.TEXT,
          value: null,
        },
        {
          key: 'fourth_key',
          type: CustomFieldTypes.TEXT,
          value: null,
        },
      ];

      expect(buildCustomFieldsForRequest(customFieldsConfiguration, templateCustomFields)).toEqual([
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          value: 'test value',
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TEXT,
          value: 'N/A',
        },
        {
          key: 'third_key',
          type: CustomFieldTypes.TEXT,
          value: 'N/A',
        },
        {
          key: 'fourth_key',
          type: CustomFieldTypes.TEXT,
          value: null,
        },
      ]);
    });

    it('ensure template toggle custom fields are built correctly', () => {
      const customFieldsConfiguration: CustomFieldsConfiguration = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'toggle 1',
          required: false,
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'toggle 2',
          required: true,
          defaultValue: false,
        },
        {
          key: 'third_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'toggle 3',
          required: true,
        },
        {
          key: 'fourth_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'toggle 4',
          required: false,
          defaultValue: true,
        },
      ];

      const templateCustomFields: CaseCustomFields = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TOGGLE,
          value: true,
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          value: null,
        },
        {
          key: 'third_key',
          type: CustomFieldTypes.TOGGLE,
          value: true,
        },
        {
          key: 'fourth_key',
          type: CustomFieldTypes.TOGGLE,
          value: null,
        },
      ];

      expect(buildCustomFieldsForRequest(customFieldsConfiguration, templateCustomFields)).toEqual([
        {
          key: 'first_key',
          type: CustomFieldTypes.TOGGLE,
          value: true,
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          value: false,
        },
        {
          key: 'third_key',
          type: CustomFieldTypes.TOGGLE,
          value: true,
        },
        {
          key: 'fourth_key',
          type: CustomFieldTypes.TOGGLE,
          value: null,
        },
      ]);
    });

    it('ensure template custom fields are built correctly when configuration has different required custom fields than template', () => {
      const customFieldsConfiguration: CustomFieldsConfiguration = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          label: 'text 1',
          required: false,
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'toggle 2',
          required: true,
        },
        {
          key: 'third_key',
          type: CustomFieldTypes.TEXT,
          label: 'text 3',
          required: true,
        },
        {
          key: 'fourth_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'toggle 4',
          required: false,
          defaultValue: true,
        },
      ];

      const templateCustomFields: CaseCustomFields = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          value: 'test 1',
        },
      ];

      expect(buildCustomFieldsForRequest(customFieldsConfiguration, templateCustomFields)).toEqual([
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          value: 'test 1',
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          value: false,
        },
        {
          key: 'third_key',
          type: CustomFieldTypes.TEXT,
          value: 'N/A',
        },
        {
          key: 'fourth_key',
          type: CustomFieldTypes.TOGGLE,
          value: null,
        },
      ]);
    });

    it('return empty when no configuration', () => {
      const customFieldsConfiguration: CustomFieldsConfiguration = [];

      const templateCustomFields: CaseCustomFields = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          value: 'test 1',
        },
      ];

      expect(buildCustomFieldsForRequest(customFieldsConfiguration, templateCustomFields)).toEqual(
        []
      );
    });

    it('return configuration custom fields when no template', () => {
      const customFieldsConfiguration: CustomFieldsConfiguration = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          label: 'text 1',
          required: false,
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'toggle 2',
          required: true,
        },
      ];
      const templateCustomFields: CaseCustomFields = [];

      expect(buildCustomFieldsForRequest(customFieldsConfiguration, templateCustomFields)).toEqual([
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          value: false,
        },
      ]);
    });
  });

  describe('constructRequiredKibanaPrivileges', () => {
    it('construct the required kibana privileges correctly', () => {
      expect(constructRequiredKibanaPrivileges('my-owner')).toEqual([
        'cases:my-owner/createCase',
        'cases:my-owner/updateCase',
        'cases:my-owner/deleteCase',
        'cases:my-owner/pushCase',
        'cases:my-owner/createComment',
        'cases:my-owner/updateComment',
        'cases:my-owner/deleteComment',
        'cases:my-owner/findConfigurations',
        'cases:my-owner/reopenCase',
        'cases:my-owner/assignCase',
      ]);
    });
  });
});
