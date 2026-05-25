/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { monaco } from '@kbn/monaco';
import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';
import { useExtendsValidation } from './use_extends_validation';
import { EXTENDS_CHAINING_ERROR, EXTENDS_NOT_FOUND_ERROR } from '../translations';

jest.mock('@kbn/monaco', () => ({
  monaco: {
    editor: {
      setModelMarkers: jest.fn(),
    },
  },
}));

jest.mock('./use_get_template');

import { useGetTemplate } from './use_get_template';

const mockUseGetTemplate = useGetTemplate as jest.MockedFunction<typeof useGetTemplate>;
const mockSetModelMarkers = monaco.editor.setModelMarkers as jest.Mock;

const makeTemplate = (overrides: Partial<ParsedTemplate['definition']> = {}): ParsedTemplate => ({
  templateId: 'parent-id',
  name: 'Parent Template',
  owner: 'securitySolution',
  definition: { name: 'Parent Template', fields: [], ...overrides },
  definitionString: 'name: Parent Template\nfields: []\n',
  templateVersion: 1,
  deletedAt: null,
  isLatest: true,
  latestVersion: 1,
});

const makeEditor = () => {
  const mockModel = {} as monaco.editor.ITextModel;
  return {
    editor: {
      getModel: jest.fn(() => mockModel),
    } as unknown as monaco.editor.IStandaloneCodeEditor,
    model: mockModel,
  };
};

const YAML_WITH_EXTENDS = 'name: My Template\nextends: parent-id\n';

describe('useExtendsValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseGetTemplate.mockReturnValue({
      data: undefined,
      isError: false,
      isFetched: false,
    } as ReturnType<typeof useGetTemplate>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('clears markers when editor is null', () => {
    mockUseGetTemplate.mockReturnValue({
      data: undefined,
      isError: false,
      isFetched: true,
    } as ReturnType<typeof useGetTemplate>);

    renderHook(() => useExtendsValidation(null, YAML_WITH_EXTENDS));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockSetModelMarkers).not.toHaveBeenCalled();
  });

  it('clears markers when extends is not present in yaml', () => {
    const { editor, model } = makeEditor();
    mockUseGetTemplate.mockReturnValue({
      data: undefined,
      isError: false,
      isFetched: true,
    } as ReturnType<typeof useGetTemplate>);

    renderHook(() => useExtendsValidation(editor, 'name: My Template\n'));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockSetModelMarkers).toHaveBeenCalledWith(model, 'extends-validation', []);
  });

  it('sets a not-found error marker when the parent template does not exist', () => {
    const { editor, model } = makeEditor();
    mockUseGetTemplate.mockReturnValue({
      data: undefined,
      isError: true,
      isFetched: true,
    } as ReturnType<typeof useGetTemplate>);

    renderHook(() => useExtendsValidation(editor, YAML_WITH_EXTENDS));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockSetModelMarkers).toHaveBeenCalledWith(
      model,
      'extends-validation',
      expect.arrayContaining([
        expect.objectContaining({
          severity: 8,
          message: EXTENDS_NOT_FOUND_ERROR('parent-id'),
          source: 'extends-validation',
        }),
      ])
    );
  });

  it('sets a chaining error marker when the parent template itself extends another template', () => {
    const { editor, model } = makeEditor();
    mockUseGetTemplate.mockReturnValue({
      data: makeTemplate({ extends: 'grandparent-id' }),
      isError: false,
      isFetched: true,
    } as ReturnType<typeof useGetTemplate>);

    renderHook(() => useExtendsValidation(editor, YAML_WITH_EXTENDS));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockSetModelMarkers).toHaveBeenCalledWith(
      model,
      'extends-validation',
      expect.arrayContaining([
        expect.objectContaining({
          severity: 8,
          message: EXTENDS_CHAINING_ERROR,
          source: 'extends-validation',
        }),
      ])
    );
  });

  it('clears markers when the parent template is valid and does not chain', () => {
    const { editor } = makeEditor();
    mockUseGetTemplate.mockReturnValue({
      data: makeTemplate(),
      isError: false,
      isFetched: true,
    } as ReturnType<typeof useGetTemplate>);

    renderHook(() => useExtendsValidation(editor, YAML_WITH_EXTENDS));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    const lastCall = mockSetModelMarkers.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    expect(lastCall![2]).toEqual([]);
  });
});
