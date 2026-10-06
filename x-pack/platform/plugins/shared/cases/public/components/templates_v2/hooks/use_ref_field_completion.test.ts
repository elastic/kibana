/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';

const mockRegisterCompletionItemProvider = jest.fn();
const mockDispose = jest.fn();

jest.mock('@kbn/monaco', () => ({
  monaco: {
    languages: {
      registerCompletionItemProvider: (...args: unknown[]) => {
        mockRegisterCompletionItemProvider(...args);
        return { dispose: mockDispose };
      },
      CompletionItemKind: { Reference: 17 },
    },
    // A no-op stand-in — the completion provider constructs a Range, but the tests assert on the
    // suggestion labels, not the range geometry. (A class with TS parameter properties trips jest's
    // mock-factory hoist analyzer, so keep it property-free.)
    Range: class MockRange {},
  },
}));

const mockUseGetFieldDefinitions = jest.fn();
jest.mock('../../field_library/hooks/use_get_field_definitions', () => ({
  useGetFieldDefinitions: (args: unknown) => mockUseGetFieldDefinitions(args),
}));

import { useRefFieldCompletion } from './use_ref_field_completion';

const field = (name: string, isGlobal = false): FieldDefinition =>
  ({ fieldDefinitionId: name, name, definition: '', owner: 'cases', isGlobal } as FieldDefinition);

const createEditor = (uri: string) =>
  ({
    getModel: () => ({
      uri: { toString: () => uri },
      getValueInRange: () => '  - $ref: roo',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial Monaco editor test double
  } as any);

const getRegisteredProvider = () => mockRegisterCompletionItemProvider.mock.calls[0][1];

const completionArgs = (uri: string) => [
  { uri: { toString: () => uri }, getValueInRange: () => '  - $ref: roo' },
  { lineNumber: 1, column: 14 },
];

describe('useRefFieldCompletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetFieldDefinitions.mockReturnValue({
      data: { fieldDefinitions: [field('root_cause')] },
    });
  });

  it('registers a single yaml completion provider and disposes it on unmount', () => {
    const { unmount } = renderHook(() => useRefFieldCompletion(createEditor('model-a'), 'cases'));

    expect(mockRegisterCompletionItemProvider).toHaveBeenCalledTimes(1);
    expect(mockRegisterCompletionItemProvider.mock.calls[0][0]).toBe('yaml');

    unmount();
    expect(mockDispose).toHaveBeenCalledTimes(1);
  });

  it('scopes suggestions to the editor model URI (no leakage into other yaml editors)', () => {
    renderHook(() => useRefFieldCompletion(createEditor('model-a'), 'cases'));
    const provider = getRegisteredProvider();

    const foreign = provider.provideCompletionItems(...completionArgs('other-model'));
    expect(foreign.suggestions).toEqual([]);

    const owned = provider.provideCompletionItems(...completionArgs('model-a'));
    expect(owned.suggestions.map((s: { label: string }) => s.label)).toEqual(['root_cause']);
  });

  it('reflects newly-loaded field definitions without re-registering the provider', () => {
    mockUseGetFieldDefinitions.mockReturnValue({ data: { fieldDefinitions: [] } });
    // Stable editor ref across renders (as in the real component, where it's editorRef.current), so
    // the provider-registration effect does not re-run on rerender.
    const editor = createEditor('model-a');
    const { rerender } = renderHook(() => useRefFieldCompletion(editor, 'cases'));

    const provider = getRegisteredProvider();
    expect(provider.provideCompletionItems(...completionArgs('model-a')).suggestions).toEqual([]);

    // Data loads in on a later render — provider must not re-register, but must see the new field.
    mockUseGetFieldDefinitions.mockReturnValue({
      data: { fieldDefinitions: [field('impact', true)] },
    });
    rerender();

    expect(mockRegisterCompletionItemProvider).toHaveBeenCalledTimes(1);
    const suggestions = provider.provideCompletionItems(...completionArgs('model-a')).suggestions;
    expect(suggestions.map((s: { label: string }) => s.label)).toEqual(['impact']);
  });

  it('does nothing when there is no editor', () => {
    renderHook(() => useRefFieldCompletion(null, 'cases'));
    expect(mockRegisterCompletionItemProvider).not.toHaveBeenCalled();
  });
});
