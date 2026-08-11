/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { useGlobalInlineFields } from './use_global_inline_fields';
import { useGetFieldDefinitions } from '../../field_library/hooks/use_get_field_definitions';

jest.mock('../../field_library/hooks/use_get_field_definitions');
const useGetFieldDefinitionsMock = useGetFieldDefinitions as jest.Mock;

describe('useGlobalInlineFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters out display-only (e.g. MARKDOWN) fields — they hold no per-case value', () => {
    useGetFieldDefinitionsMock.mockReturnValue({
      data: {
        fieldDefinitions: [
          {
            definition: 'name: priority\nlabel: Priority\ncontrol: INPUT_TEXT\ntype: keyword\n',
          },
          {
            definition:
              'name: instructions\nlabel: Instructions\ncontrol: MARKDOWN\ntype: keyword\nmetadata:\n  content: "read me"\n',
          },
        ],
      },
      isFetching: false,
    });

    const { result } = renderHook(() => useGlobalInlineFields(), {
      wrapper: TestProviders,
    });

    expect(result.current.globalInlineFields.map((f) => f.name)).toEqual(['priority']);
  });
});
