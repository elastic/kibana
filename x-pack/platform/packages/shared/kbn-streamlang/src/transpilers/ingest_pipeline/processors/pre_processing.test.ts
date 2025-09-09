/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPreProcessorsForTemplateEscaping } from './pre_processing';

describe('getPreProcessorsForTemplateEscaping', () => {
  it('returns original value for non-templatable field', () => {
    const result = getPreProcessorsForTemplateEscaping('set', 'nonexistent', 'foo');
    expect(result).toEqual({ before: [], preProcessedValue: 'foo', after: [] });
  });

  it('returns original value for templatable field but non-template value', () => {
    const result = getPreProcessorsForTemplateEscaping('rename', 'to', 'foo');
    expect(result).toEqual({ before: [], preProcessedValue: 'foo', after: [] });
  });

  it('returns original value for templatable field with less than 2 braces', () => {
    expect(getPreProcessorsForTemplateEscaping('rename', 'to', '{foo}')).toEqual({
      before: [],
      preProcessedValue: '{foo}',
      after: [],
    });
    expect(getPreProcessorsForTemplateEscaping('set', 'value', '{foo')).toEqual({
      before: [],
      preProcessedValue: '{foo',
      after: [],
    });
    expect(getPreProcessorsForTemplateEscaping('append', 'value', 'foo}')).toEqual({
      before: [],
      preProcessedValue: 'foo}',
      after: [],
    });
  });

  it('returns pre/post processors for valid template ({{foo}}) for rename.to', () => {
    const result = getPreProcessorsForTemplateEscaping('rename', 'target_field', '{{foo}}');
    expect(result.before).toEqual([
      { script: { source: `ctx['__escaped__target_field'] = '{{foo}}'` } },
    ]);
    expect(result.preProcessedValue).toBe('{{__escaped__target_field}}');
    expect(result.after).toEqual([{ remove: { field: '__escaped__target_field' } }]);
  });

  it('returns pre/post processors for valid template ({{{foo}}}) for set.value', () => {
    const result = getPreProcessorsForTemplateEscaping('set', 'value', '{{{foo}}}');
    expect(result.before).toEqual([
      { script: { source: `ctx['__escaped__value'] = '{{{foo}}}'` } },
    ]);
    expect(result.preProcessedValue).toBe('{{__escaped__value}}');
    expect(result.after).toEqual([{ remove: { field: '__escaped__value' } }]);
  });

  it('returns original value for empty string', () => {
    expect(getPreProcessorsForTemplateEscaping('set', 'value', '')).toEqual({
      before: [],
      preProcessedValue: '',
      after: [],
    });
  });

  it('returns pre/post processors for only braces', () => {
    expect(getPreProcessorsForTemplateEscaping('set', 'value', '{{')).toEqual({
      before: [{ script: { source: `ctx['__escaped__value'] = '{{'` } }],
      preProcessedValue: '{{__escaped__value}}',
      after: [{ remove: { field: '__escaped__value' } }],
    });
    expect(getPreProcessorsForTemplateEscaping('set', 'value', '}}')).toEqual({
      before: [{ script: { source: `ctx['__escaped__value'] = '}}'` } }],
      preProcessedValue: '{{__escaped__value}}',
      after: [{ remove: { field: '__escaped__value' } }],
    });
  });

  it('returns pre/post processors for set.value with template', () => {
    const result = getPreProcessorsForTemplateEscaping('set', 'value', '{{bar}}');
    expect(result.before).toEqual([{ script: { source: `ctx['__escaped__value'] = '{{bar}}'` } }]);
    expect(result.preProcessedValue).toBe('{{__escaped__value}}');
    expect(result.after).toEqual([{ remove: { field: '__escaped__value' } }]);
  });

  it('returns pre/post processors for append.value with template', () => {
    const result = getPreProcessorsForTemplateEscaping('append', 'value', '{{baz}}');
    expect(result.before).toEqual([{ script: { source: `ctx['__escaped__value'] = '{{baz}}'` } }]);
    expect(result.preProcessedValue).toBe('{{__escaped__value}}');
    expect(result.after).toEqual([{ remove: { field: '__escaped__value' } }]);
  });

  it('returns pre/post processors for set.copy_from with template', () => {
    const result = getPreProcessorsForTemplateEscaping('set', 'value', '{{copy}}');
    expect(result.before).toEqual([{ script: { source: `ctx['__escaped__value'] = '{{copy}}'` } }]);
    expect(result.preProcessedValue).toBe('{{__escaped__value}}');
    expect(result.after).toEqual([{ remove: { field: '__escaped__value' } }]);
  });

  it('handles array of values with mixed templates and non-templates', () => {
    const result = getPreProcessorsForTemplateEscaping('append', 'value', [
      '{{one}}',
      'two',
      '{{{three}}}',
    ]);
    expect(result.before).toEqual([
      { script: { source: `ctx['__escaped__value'] = '{{one}}'` } },
      { script: { source: `ctx['__escaped__value__2'] = '{{{three}}}'` } },
    ]);
    expect(result.preProcessedValue).toEqual([
      '{{__escaped__value}}',
      'two',
      '{{__escaped__value__2}}',
    ]);
    expect(result.after).toEqual([
      { remove: { field: '__escaped__value' } },
      { remove: { field: '__escaped__value__2' } },
    ]);
  });
});
