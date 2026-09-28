/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveAggregatableControlField } from './resolve_aggregatable_control_field';

const sampleLogsFields = {
  host: 'text',
  'host.keyword': 'keyword',
  response: 'text',
  'response.keyword': 'keyword',
  clientip: 'ip',
  bytes: 'long',
};

describe('resolveAggregatableControlField', () => {
  it('keeps an aggregatable field as requested', () => {
    expect(
      resolveAggregatableControlField({
        fieldName: 'host.keyword',
        fields: sampleLogsFields,
      })
    ).toEqual({ fieldName: 'host.keyword' });
  });

  it('rewrites a non-aggregatable text field to its keyword sibling', () => {
    expect(
      resolveAggregatableControlField({
        fieldName: 'host',
        fields: sampleLogsFields,
      })
    ).toEqual({ fieldName: 'host.keyword' });
  });

  it('keeps an aggregatable ip field without inventing a keyword suffix', () => {
    expect(
      resolveAggregatableControlField({
        fieldName: 'clientip',
        fields: sampleLogsFields,
      })
    ).toEqual({ fieldName: 'clientip' });
  });

  it('rejects a field that is not in the mapping', () => {
    expect(
      resolveAggregatableControlField({
        fieldName: 'method',
        fields: sampleLogsFields,
      })
    ).toEqual({
      error: 'Field "method" is not an aggregatable field on this index.',
    });
  });

  it('rejects a text field with no aggregatable keyword sibling', () => {
    expect(
      resolveAggregatableControlField({
        fieldName: 'message',
        fields: { message: 'text' },
      })
    ).toEqual({
      error: 'Field "message" is not an aggregatable field on this index.',
    });
  });
});
