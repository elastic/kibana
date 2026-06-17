/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useResolvedFields } from './use_resolved_fields';
import type { Field } from '../../../../common/types/domain/template/fields';

const mockUseGetFieldDefinitions = jest.fn();
jest.mock('./use_get_field_definitions', () => ({
  useGetFieldDefinitions: (...args: unknown[]) => mockUseGetFieldDefinitions(...args),
}));

const inlineField: Field = {
  name: 'inline',
  control: 'INPUT_TEXT',
  type: 'keyword',
};

const libraryFieldDefinition = {
  name: 'lib_field',
  owner: 'securitySolution',
  fieldDefinitionId: 'fd-1',
  definition:
    'name: lib_field\ncontrol: INPUT_TEXT\ntype: keyword\nmetadata:\n  default: from_lib\n',
};

describe('useResolvedFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetFieldDefinitions.mockReturnValue({
      data: { fieldDefinitions: [libraryFieldDefinition] },
      isLoading: false,
    });
  });

  it('passes inline fields through unchanged', () => {
    const { result } = renderHook(() => useResolvedFields([inlineField], 'securitySolution'));
    expect(result.current.resolvedFields).toHaveLength(1);
    expect(result.current.resolvedFields[0]).toEqual(inlineField);
  });

  it('resolves a $ref field to its library definition', () => {
    const refField: Field = { $ref: 'lib_field' };
    const { result } = renderHook(() => useResolvedFields([refField], 'securitySolution'));
    expect(result.current.resolvedFields).toHaveLength(1);
    expect(result.current.resolvedFields[0].name).toBe('lib_field');
    expect(result.current.resolvedFields[0].control).toBe('INPUT_TEXT');
  });

  it('uses the override name when the $ref entry has a name property', () => {
    const refField: Field = { $ref: 'lib_field', name: 'my_override' };
    const { result } = renderHook(() => useResolvedFields([refField], 'securitySolution'));
    expect(result.current.resolvedFields).toHaveLength(1);
    expect(result.current.resolvedFields[0].name).toBe('my_override');
  });

  it('silently drops a $ref with an unknown name', () => {
    const refField: Field = { $ref: 'unknown_field' };
    const { result } = renderHook(() => useResolvedFields([refField], 'securitySolution'));
    expect(result.current.resolvedFields).toHaveLength(0);
  });

  it('silently drops a $ref whose library definition contains invalid YAML', () => {
    mockUseGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          {
            name: 'bad_field',
            owner: 'securitySolution',
            fieldDefinitionId: 'fd-2',
            definition: ': {bad yaml',
          },
        ],
      },
      isLoading: false,
    });
    const refField: Field = { $ref: 'bad_field' };
    const { result } = renderHook(() => useResolvedFields([refField], 'securitySolution'));
    expect(result.current.resolvedFields).toHaveLength(0);
  });

  it('silently drops a $ref whose library definition parses to another ref field', () => {
    mockUseGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          {
            name: 'nested_ref',
            owner: 'securitySolution',
            fieldDefinitionId: 'fd-3',
            definition: '$ref: another_field\n',
          },
        ],
      },
      isLoading: false,
    });
    const refField: Field = { $ref: 'nested_ref' };
    const { result } = renderHook(() => useResolvedFields([refField], 'securitySolution'));
    expect(result.current.resolvedFields).toHaveLength(0);
  });

  it('returns isLoading true while field definitions are loading', () => {
    mockUseGetFieldDefinitions.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useResolvedFields([inlineField], 'securitySolution'));
    expect(result.current.isLoading).toBe(true);
  });

  it('mixes inline and ref fields, returning them in order', () => {
    const fields: Field[] = [inlineField, { $ref: 'lib_field' }];
    const { result } = renderHook(() => useResolvedFields(fields, 'securitySolution'));
    expect(result.current.resolvedFields).toHaveLength(2);
    expect(result.current.resolvedFields[0].name).toBe('inline');
    expect(result.current.resolvedFields[1].name).toBe('lib_field');
  });

  it('passes owner to useGetFieldDefinitions', () => {
    renderHook(() => useResolvedFields([inlineField], 'observability'));
    expect(mockUseGetFieldDefinitions).toHaveBeenCalledWith({ owner: 'observability' });
  });

  describe('$ref metadata.default override', () => {
    it('merges the override default onto the resolved field', () => {
      const refField: Field = {
        $ref: 'lib_field',
        metadata: { default: 'override' },
      };
      const { result } = renderHook(() => useResolvedFields([refField], 'securitySolution'));
      expect(result.current.resolvedFields).toHaveLength(1);
      expect(result.current.resolvedFields[0].metadata).toMatchObject({ default: 'override' });
    });

    it('falls back to the library default when no override is set', () => {
      const refField: Field = { $ref: 'lib_field' };
      const { result } = renderHook(() => useResolvedFields([refField], 'securitySolution'));
      expect(result.current.resolvedFields[0].metadata).toMatchObject({ default: 'from_lib' });
    });

    it('combines name alias and metadata.default override on the same entry', () => {
      const refField: Field = {
        $ref: 'lib_field',
        name: 'my_alias',
        metadata: { default: 'override' },
      };
      const { result } = renderHook(() => useResolvedFields([refField], 'securitySolution'));
      expect(result.current.resolvedFields[0].name).toBe('my_alias');
      expect(result.current.resolvedFields[0].metadata).toMatchObject({ default: 'override' });
    });
  });
});
