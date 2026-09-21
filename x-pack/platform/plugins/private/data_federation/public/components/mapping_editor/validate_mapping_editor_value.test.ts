/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingEditorValue } from './mapping_editor';
import { validateMappingEditorValue } from './validate_mapping_editor_value';

describe('validateMappingEditorValue', () => {
  it('returns valid for an empty editor value', () => {
    const value: MappingEditorValue = { dynamic: true, fields: [] };
    const result = validateMappingEditorValue(value);

    expect(result.isValid).toBe(true);
    expect(result.hasAnyDeclaredMappings).toBe(false);
    expect(result.globalErrors).toEqual([]);
    expect(result.fieldErrorsById).toEqual({});
  });

  it('ignores fully-blank fields', () => {
    const value: MappingEditorValue = {
      dynamic: true,
      fields: [{ id: '1', name: '', path: '', type: '', format: '' }],
    };

    const result = validateMappingEditorValue(value);
    expect(result.isValid).toBe(true);
    expect(result.hasAnyDeclaredMappings).toBe(false);
    expect(result.fieldErrorsById).toEqual({});
  });

  it('requires name and type', () => {
    const value: MappingEditorValue = {
      dynamic: true,
      fields: [{ id: '1', name: '', path: 'event_time', type: '' as const, format: '' }],
    };

    const result = validateMappingEditorValue(value);
    expect(result.isValid).toBe(false);
    expect(result.fieldErrorsById['1']).toEqual({
      name: 'Name is required.',
      type: 'Type is required.',
    });
  });

  it('requires unique field names (case-sensitive)', () => {
    const value: MappingEditorValue = {
      dynamic: true,
      fields: [
        { id: '1', name: 'status_code', path: '', type: 'integer', format: '' },
        { id: '2', name: 'status_code', path: '', type: 'integer', format: '' },
      ],
    };

    const result = validateMappingEditorValue(value);
    expect(result.isValid).toBe(false);
    expect(result.fieldErrorsById['1']?.name).toBe('Names must be unique.');
    expect(result.fieldErrorsById['2']?.name).toBe('Names must be unique.');
  });

  it('does not require original field name (path)', () => {
    const value: MappingEditorValue = {
      dynamic: true,
      fields: [{ id: '1', name: 'status_code', path: '', type: 'integer', format: '' }],
    };

    const result = validateMappingEditorValue(value);
    expect(result.isValid).toBe(true);
    expect(result.hasAnyDeclaredMappings).toBe(true);
  });

  it('disallows format for non-date types', () => {
    const value: MappingEditorValue = {
      dynamic: true,
      fields: [{ id: '1', name: 'event_time', path: '', type: 'keyword', format: 'yyyy' }],
    };

    const result = validateMappingEditorValue(value);
    expect(result.isValid).toBe(false);
    expect(result.fieldErrorsById['1']?.format).toBe('Format is only valid for type date.');
  });

  it('allows format for date types', () => {
    const value: MappingEditorValue = {
      dynamic: true,
      fields: [{ id: '1', name: '@timestamp', path: 'event_time', type: 'date', format: 'yyyy' }],
    };

    const result = validateMappingEditorValue(value);
    expect(result.isValid).toBe(true);
    expect(result.hasAnyDeclaredMappings).toBe(true);
  });

  it('allows format for date_nanos types', () => {
    const value: MappingEditorValue = {
      dynamic: true,
      fields: [
        { id: '1', name: '@timestamp', path: 'event_time', type: 'date_nanos', format: 'yyyy' },
      ],
    };

    const result = validateMappingEditorValue(value);
    expect(result.isValid).toBe(true);
    expect(result.hasAnyDeclaredMappings).toBe(true);
  });
});
