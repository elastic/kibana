/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FieldFormatsService } from '../../../../../../../../src/legacy/ui/field_formats/mixin/field_formats_service';
// Reporting uses an unconventional directory structure so the linter marks this as a violation
import {
  DateFormat,
  BytesFormat,
  DefaultNumberFormat,
  StaticLookupFormat,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../../../../src/plugins/data/server';
import { fieldFormatMapFactory } from './field_format_map';

type ConfigValue = { number: { id: string; params: {} } } | string;

describe('field format map', function() {
  const indexPatternSavedObject = {
    id: 'logstash-*',
    type: 'index-pattern',
    version: 'abc',
    attributes: {
      title: 'logstash-*',
      timeFieldName: '@timestamp',
      notExpandable: true,
      fields:
        '[{"name":"field1","type":"number"}, {"name":"field2","type":"date"}, {"name":"field3","type":"string"}]',
      fieldFormatMap:
        '{"field1":{"id":"bytes"},"field3":{"id":"static_lookup","params":{"lookupEntries":[{"key":"test","value":"tested"}]}}}',
    },
  };
  const configMock: Record<string, ConfigValue> = {};
  configMock.dateFormat = 'YYYY-MM-DD';
  configMock['dateFormat:tz'] = 'Europe/London';
  configMock['format:defaultTypeMap'] = {
    number: { id: 'default_number', params: {} },
    string: { id: 'string', params: {} },
    date: { id: 'date', params: {} },
    _default_: { id: 'string', params: {} },
  };
  const getConfig = (key: string) => configMock[key];
  const testValue = 'test';

  const fieldFormats = new FieldFormatsService(
    [DefaultNumberFormat, BytesFormat, StaticLookupFormat, DateFormat],
    getConfig
  );

  const formatMap = fieldFormatMapFactory(indexPatternSavedObject, fieldFormats);

  it('should build field format map with entry per index pattern field, excluding numbers', function() {
    expect(formatMap.has('field1')).to.be(false);
    expect(formatMap.has('field2')).to.be(true);
    expect(formatMap.has('field3')).to.be(true);
    expect(formatMap.has('field_not_in_index')).to.be(false);
  });

  it('should create custom FieldFormat for fields with configured field formatter', function() {
    expect(formatMap.get('field3').convert(testValue)).to.be('tested');
  });

  it('should create default FieldFormat for fields with no field formatter', function() {
    expect(formatMap.get('field2').convert(1578948388064)).to.be('2020-01-13');
  });
});
