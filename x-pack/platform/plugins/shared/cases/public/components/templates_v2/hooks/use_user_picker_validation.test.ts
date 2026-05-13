/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import yaml from 'yaml';
import { monaco } from '@kbn/monaco';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import { useUserPickerValidation, collectUserPickerDefaults } from './use_user_picker_validation';
import * as api from '../../../containers/user_profiles/api';

jest.mock('@kbn/monaco', () => ({
  monaco: {
    editor: {
      setModelMarkers: jest.fn(),
      MarkerSeverity: {
        Error: 8,
        Warning: 4,
      },
    },
    MarkerSeverity: {
      Error: 8,
      Warning: 4,
    },
  },
}));

jest.mock('../../../containers/user_profiles/api', () => ({
  bulkGetUserProfiles: jest.fn(),
}));

const mockSetModelMarkers = monaco.editor.setModelMarkers as jest.Mock;
const mockBulkGetUserProfiles = api.bulkGetUserProfiles as jest.Mock;

const makeSecurity = (): SecurityPluginStart => ({} as unknown as SecurityPluginStart);

const makeModel = () =>
  ({
    uri: { toString: () => 'test-uri' },
    isDisposed: jest.fn(() => false),
  } as unknown as monaco.editor.ITextModel);

const makeEditor = (model: monaco.editor.ITextModel) =>
  ({
    getModel: jest.fn(() => model),
  } as unknown as monaco.editor.IStandaloneCodeEditor);

const makeProfile = (uid: string, fullName: string) => ({
  uid,
  user: { username: uid, full_name: fullName, email: '' },
  data: {},
});

describe('collectUserPickerDefaults', () => {
  const yamlContent = `name: Test Template
fields:
  - name: assignee
    control: USER_PICKER
    type: keyword
    metadata:
      default:
        - uid: uid-1
          name: Alice
        - uid: uid-2
          name: Bob`;

  it('collects uid and name from USER_PICKER default entries', () => {
    const parsed = yaml.parse(yamlContent);
    const userPickerFields = parsed.fields.filter(
      (f: Record<string, unknown>) => f.control === 'USER_PICKER'
    );
    const infos = collectUserPickerDefaults(yamlContent, userPickerFields);

    expect(infos).toHaveLength(2);
    expect(infos[0].uid).toBe('uid-1');
    expect(infos[0].name).toBe('Alice');
    expect(infos[1].uid).toBe('uid-2');
    expect(infos[1].name).toBe('Bob');
  });

  it('returns empty array when there are no USER_PICKER fields', () => {
    const infos = collectUserPickerDefaults(yamlContent, []);
    expect(infos).toHaveLength(0);
  });

  it('returns empty array when metadata.default is absent', () => {
    const noDefault = [{ control: 'USER_PICKER', name: 'assignee' }];
    const infos = collectUserPickerDefaults(yamlContent, noDefault);
    expect(infos).toHaveLength(0);
  });
});

describe('useUserPickerValidation', () => {
  let mockModel: monaco.editor.ITextModel;
  let mockEditor: monaco.editor.IStandaloneCodeEditor;
  let security: SecurityPluginStart;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockModel = makeModel();
    mockEditor = makeEditor(mockModel);
    security = makeSecurity();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call setModelMarkers when editor is null', async () => {
    renderHook(() => useUserPickerValidation(null, 'name: test', security));

    await act(async () => {
      jest.runAllTimers();
    });

    expect(mockSetModelMarkers).not.toHaveBeenCalled();
  });

  it('sets empty markers when YAML has no USER_PICKER fields', async () => {
    const yamlStr =
      'name: Template\nfields:\n  - name: f1\n    control: INPUT_TEXT\n    type: keyword';
    mockBulkGetUserProfiles.mockResolvedValue([]);

    renderHook(() => useUserPickerValidation(mockEditor, yamlStr, security));

    await act(async () => {
      jest.runAllTimers();
    });

    expect(mockSetModelMarkers).toHaveBeenCalledWith(mockModel, 'user-picker-validation', []);
  });

  it('sets empty markers when all default users are valid', async () => {
    const yamlStr = `name: T
fields:
  - name: assignee
    control: USER_PICKER
    type: keyword
    metadata:
      default:
        - uid: uid-1
          name: Alice`;

    mockBulkGetUserProfiles.mockResolvedValue([makeProfile('uid-1', 'Alice')]);

    renderHook(() => useUserPickerValidation(mockEditor, yamlStr, security));

    await act(async () => {
      jest.runAllTimers();
    });

    const markers = mockSetModelMarkers.mock.calls[0][2];
    expect(markers).toHaveLength(0);
  });

  it('sets error markers when a uid is not found in user profiles', async () => {
    const yamlStr = `name: T
fields:
  - name: assignee
    control: USER_PICKER
    type: keyword
    metadata:
      default:
        - uid: uid-missing
          name: Ghost`;

    mockBulkGetUserProfiles.mockResolvedValue([]);

    renderHook(() => useUserPickerValidation(mockEditor, yamlStr, security));

    await act(async () => {
      jest.runAllTimers();
    });

    expect(mockSetModelMarkers).toHaveBeenCalled();
    const markers = mockSetModelMarkers.mock.calls[0][2];
    expect(markers).toHaveLength(1);
    expect(markers[0].severity).toBe(8);
    expect(markers[0].source).toBe('user-picker-validation');
    expect(markers[0].message).toContain('Ghost');
  });

  it('sets error markers when a user display name has changed', async () => {
    const yamlStr = `name: T
fields:
  - name: assignee
    control: USER_PICKER
    type: keyword
    metadata:
      default:
        - uid: uid-1
          name: OldName`;

    mockBulkGetUserProfiles.mockResolvedValue([makeProfile('uid-1', 'NewName')]);

    renderHook(() => useUserPickerValidation(mockEditor, yamlStr, security));

    await act(async () => {
      jest.runAllTimers();
    });

    const markers = mockSetModelMarkers.mock.calls[0][2];
    expect(markers).toHaveLength(1);
    expect(markers[0].message).toContain('OldName');
  });

  it('sets empty markers on invalid YAML', async () => {
    renderHook(() => useUserPickerValidation(mockEditor, 'name: [broken yaml', security));

    await act(async () => {
      jest.runAllTimers();
    });

    expect(mockSetModelMarkers).toHaveBeenCalledWith(mockModel, 'user-picker-validation', []);
  });

  it('debounces validation calls', async () => {
    const yamlStr = 'name: T';
    mockBulkGetUserProfiles.mockResolvedValue([]);

    const { rerender } = renderHook(
      ({ value }) => useUserPickerValidation(mockEditor, value, security),
      { initialProps: { value: yamlStr } }
    );

    rerender({ value: 'name: T2' });
    rerender({ value: 'name: T3' });

    expect(mockSetModelMarkers).not.toHaveBeenCalled();

    await act(async () => {
      jest.runAllTimers();
    });

    expect(mockSetModelMarkers).toHaveBeenCalledTimes(1);
  });

  it('drops stale results when value changes before the async call resolves', async () => {
    const yaml1 = `name: T
fields:
  - name: assignee
    control: USER_PICKER
    type: keyword
    metadata:
      default:
        - uid: uid-stale
          name: Stale`;

    const yaml2 = 'name: T\nfields: []';

    let resolveFirst!: (value: unknown) => void;
    const firstCall = new Promise((res) => {
      resolveFirst = res;
    });

    mockBulkGetUserProfiles.mockImplementationOnce(() => firstCall).mockResolvedValue([]);

    const { rerender } = renderHook(
      ({ value }) => useUserPickerValidation(mockEditor, value, security),
      { initialProps: { value: yaml1 } }
    );

    await act(async () => {
      jest.runAllTimers();
    });

    // Second render kicks off a new generation before the first resolves
    rerender({ value: yaml2 });

    await act(async () => {
      jest.runAllTimers();
    });

    // Resolve the first (now stale) promise
    resolveFirst([]);

    await act(async () => {
      await Promise.resolve();
    });

    // Only the second (yaml2) result should have been applied
    const allCalls = mockSetModelMarkers.mock.calls;
    const lastCall = allCalls[allCalls.length - 1];
    expect(lastCall[2]).toHaveLength(0);
  });
});
