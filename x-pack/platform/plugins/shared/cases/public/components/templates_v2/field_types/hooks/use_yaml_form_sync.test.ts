/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type React from 'react';
import moment from 'moment-timezone';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useYamlToFormSync, useFormToYamlSync, useYamlFormSync } from './use_yaml_form_sync';
import type { FieldInfo, OnFieldDefaultChange } from './use_yaml_form_sync';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import type { FieldDefaultValue } from '../../utils/update_yaml_field_default';

const createMockForm = () => {
  let subscriptionCallback: (data: { data: { internal: Record<string, unknown> } }) => void;
  const unsubscribe = jest.fn();
  const form = {
    setFieldValue: jest.fn(),
    subscribe: jest.fn((cb) => {
      subscriptionCallback = cb;
      return { unsubscribe };
    }),
  } as unknown as jest.Mocked<FormHook>;

  return {
    form,
    unsubscribe,
    fireSubscription: (internal: Record<string, unknown>) => {
      subscriptionCallback({ data: { internal } });
    },
  };
};

const createParsedFields = (
  fields: Array<{
    name: string;
    type: string;
    control: string;
    defaultValue?: FieldDefaultValue;
  }>
): FieldInfo[] =>
  fields.map((f) => ({
    name: f.name,
    type: f.type,
    control: f.control,
    metadata: f.defaultValue !== undefined ? { default: f.defaultValue } : undefined,
  }));

describe('useYamlToFormSync', () => {
  let mockForm: jest.Mocked<FormHook>;
  let syncingFromYamlRef: React.MutableRefObject<boolean>;
  let lastSyncedRef: React.MutableRefObject<Record<string, string>>;

  beforeEach(() => {
    ({ form: mockForm } = createMockForm());
    syncingFromYamlRef = { current: false };
    lastSyncedRef = { current: {} };
  });

  afterEach(() => jest.clearAllMocks());

  it('sets form field values from parsed fields on mount', () => {
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Default text' },
      { name: 'count', type: 'integer', control: 'INPUT_NUMBER', defaultValue: 42 },
    ]);

    renderHook(() => useYamlToFormSync(mockForm, fields, syncingFromYamlRef, lastSyncedRef));

    expect(mockForm.setFieldValue).toHaveBeenCalledWith(
      `${CASE_EXTENDED_FIELDS}.summary_as_keyword`,
      'Default text'
    );
    expect(mockForm.setFieldValue).toHaveBeenCalledWith(
      `${CASE_EXTENDED_FIELDS}.count_as_integer`,
      '42'
    );
  });

  it('converts number defaults to strings', () => {
    const fields = createParsedFields([
      { name: 'effort', type: 'integer', control: 'INPUT_NUMBER', defaultValue: 100 },
    ]);

    renderHook(() => useYamlToFormSync(mockForm, fields, syncingFromYamlRef, lastSyncedRef));

    expect(mockForm.setFieldValue).toHaveBeenCalledWith(
      `${CASE_EXTENDED_FIELDS}.effort_as_integer`,
      '100'
    );
  });

  it('sets empty string for fields without default', () => {
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT' },
    ]);

    renderHook(() => useYamlToFormSync(mockForm, fields, syncingFromYamlRef, lastSyncedRef));

    expect(mockForm.setFieldValue).toHaveBeenCalledWith(
      `${CASE_EXTENDED_FIELDS}.summary_as_keyword`,
      ''
    );
  });

  it('sets JSON string for array defaults (CHECKBOX_GROUP)', () => {
    const fields = createParsedFields([
      {
        name: 'systems',
        type: 'keyword',
        control: 'CHECKBOX_GROUP',
        defaultValue: ['api', 'database'],
      },
    ]);

    renderHook(() => useYamlToFormSync(mockForm, fields, syncingFromYamlRef, lastSyncedRef));

    expect(mockForm.setFieldValue).toHaveBeenCalledWith(
      `${CASE_EXTENDED_FIELDS}.systems_as_keyword`,
      '["api","database"]'
    );
  });

  it('sets empty JSON array string for empty array default', () => {
    const fields = createParsedFields([
      { name: 'systems', type: 'keyword', control: 'CHECKBOX_GROUP', defaultValue: [] },
    ]);

    renderHook(() => useYamlToFormSync(mockForm, fields, syncingFromYamlRef, lastSyncedRef));

    expect(mockForm.setFieldValue).toHaveBeenCalledWith(
      `${CASE_EXTENDED_FIELDS}.systems_as_keyword`,
      '[]'
    );
  });

  it('sets syncingFromYamlRef to true during sync', () => {
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'text' },
    ]);

    renderHook(() => useYamlToFormSync(mockForm, fields, syncingFromYamlRef, lastSyncedRef));

    // Flag is set synchronously, then cleared via setTimeout
    // After the effect runs synchronously, the flag should still be true (before setTimeout fires)
    expect(syncingFromYamlRef.current).toBe(true);
  });

  it('clears syncingFromYamlRef after microtask', async () => {
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'text' },
    ]);

    renderHook(() => useYamlToFormSync(mockForm, fields, syncingFromYamlRef, lastSyncedRef));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(syncingFromYamlRef.current).toBe(false);
  });

  it('updates lastSyncedRef with synced values', () => {
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Hello' },
    ]);

    renderHook(() => useYamlToFormSync(mockForm, fields, syncingFromYamlRef, lastSyncedRef));

    expect(lastSyncedRef.current.summary).toBe('Hello');
  });

  it('skips setFieldValue when YAML default has not changed (deduplication)', () => {
    const fields = createParsedFields([
      { name: 'env', type: 'keyword', control: 'RADIO_GROUP', defaultValue: 'production' },
    ]);

    const { rerender } = renderHook(
      ({ f }) => useYamlToFormSync(mockForm, f, syncingFromYamlRef, lastSyncedRef),
      { initialProps: { f: fields } }
    );

    expect(mockForm.setFieldValue).toHaveBeenCalledTimes(1);
    mockForm.setFieldValue.mockClear();

    const identicalFields = createParsedFields([
      { name: 'env', type: 'keyword', control: 'RADIO_GROUP', defaultValue: 'production' },
    ]);
    rerender({ f: identicalFields });

    expect(mockForm.setFieldValue).not.toHaveBeenCalled();
  });

  it('calls setFieldValue when the YAML default genuinely changes', () => {
    const fields = createParsedFields([
      { name: 'env', type: 'keyword', control: 'RADIO_GROUP', defaultValue: 'production' },
    ]);

    const { rerender } = renderHook(
      ({ f }) => useYamlToFormSync(mockForm, f, syncingFromYamlRef, lastSyncedRef),
      { initialProps: { f: fields } }
    );

    mockForm.setFieldValue.mockClear();

    const updated = createParsedFields([
      { name: 'env', type: 'keyword', control: 'RADIO_GROUP', defaultValue: 'staging' },
    ]);
    rerender({ f: updated });

    expect(mockForm.setFieldValue).toHaveBeenCalledWith(
      `${CASE_EXTENDED_FIELDS}.env_as_keyword`,
      'staging'
    );
  });

  it('does nothing for empty parsedFields', () => {
    renderHook(() => useYamlToFormSync(mockForm, [], syncingFromYamlRef, lastSyncedRef));

    expect(mockForm.setFieldValue).not.toHaveBeenCalled();
    expect(syncingFromYamlRef.current).toBe(false);
  });
});

describe('useFormToYamlSync', () => {
  let syncingFromYamlRef: React.MutableRefObject<boolean>;
  let yamlDefaultsRef: React.MutableRefObject<Record<string, string>>;
  let mockOnChange: jest.MockedFunction<OnFieldDefaultChange>;
  let fireSubscription: (internal: Record<string, unknown>) => void;
  let unsubscribe: jest.Mock;
  let mockForm: jest.Mocked<FormHook>;

  beforeEach(() => {
    syncingFromYamlRef = { current: false };
    yamlDefaultsRef = { current: {} };
    mockOnChange = jest.fn();
    ({ form: mockForm, unsubscribe, fireSubscription } = createMockForm());
  });

  afterEach(() => jest.clearAllMocks());

  it('subscribes to form changes', () => {
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT' },
    ]);

    renderHook(() =>
      useFormToYamlSync(mockForm, fields, syncingFromYamlRef, yamlDefaultsRef, mockOnChange)
    );

    expect(mockForm.subscribe).toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT' },
    ]);

    const { unmount } = renderHook(() =>
      useFormToYamlSync(mockForm, fields, syncingFromYamlRef, yamlDefaultsRef, mockOnChange)
    );

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('calls onFieldDefaultChange when form value differs from YAML value', () => {
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Original' },
    ]);
    yamlDefaultsRef.current = { summary: 'Original' };

    renderHook(() =>
      useFormToYamlSync(mockForm, fields, syncingFromYamlRef, yamlDefaultsRef, mockOnChange)
    );

    act(() => {
      fireSubscription({
        [CASE_EXTENDED_FIELDS]: { summary_as_keyword: 'User typed value' },
      });
    });

    expect(mockOnChange).toHaveBeenCalledWith('summary', 'User typed value', 'INPUT_TEXT');
  });

  it('does not call onFieldDefaultChange when form value matches YAML value', () => {
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Same' },
    ]);
    yamlDefaultsRef.current = { summary: 'Same' };

    renderHook(() =>
      useFormToYamlSync(mockForm, fields, syncingFromYamlRef, yamlDefaultsRef, mockOnChange)
    );

    act(() => {
      fireSubscription({
        [CASE_EXTENDED_FIELDS]: { summary_as_keyword: 'Same' },
      });
    });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('skips subscription callback when syncingFromYamlRef is true', () => {
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Initial' },
    ]);
    yamlDefaultsRef.current = { summary: 'Initial' };
    syncingFromYamlRef.current = true;

    renderHook(() =>
      useFormToYamlSync(mockForm, fields, syncingFromYamlRef, yamlDefaultsRef, mockOnChange)
    );

    act(() => {
      fireSubscription({
        [CASE_EXTENDED_FIELDS]: { summary_as_keyword: 'Changed' },
      });
    });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('does not throw when onFieldDefaultChange is undefined', () => {
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Value' },
    ]);
    yamlDefaultsRef.current = { summary: 'Value' };

    renderHook(() =>
      useFormToYamlSync(mockForm, fields, syncingFromYamlRef, yamlDefaultsRef, undefined)
    );

    expect(() => {
      act(() => {
        fireSubscription({
          [CASE_EXTENDED_FIELDS]: { summary_as_keyword: 'Changed' },
        });
      });
    }).not.toThrow();
  });

  it('handles missing extendedFields in form data', () => {
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT' },
    ]);

    renderHook(() =>
      useFormToYamlSync(mockForm, fields, syncingFromYamlRef, yamlDefaultsRef, mockOnChange)
    );

    act(() => {
      fireSubscription({});
    });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('serializes a raw array to JSON string (Array.isArray branch)', () => {
    const fields = createParsedFields([
      { name: 'systems', type: 'keyword', control: 'CHECKBOX_GROUP', defaultValue: ['api'] },
    ]);
    yamlDefaultsRef.current = { systems: '["api"]' };

    renderHook(() =>
      useFormToYamlSync(mockForm, fields, syncingFromYamlRef, yamlDefaultsRef, mockOnChange)
    );

    act(() => {
      fireSubscription({
        [CASE_EXTENDED_FIELDS]: { systems_as_keyword: ['api', 'ui'] },
      });
    });

    expect(mockOnChange).toHaveBeenCalledWith('systems', '["api","ui"]', 'CHECKBOX_GROUP');
  });

  it('does not fire when CHECKBOX_GROUP JSON string matches YAML array', () => {
    const fields = createParsedFields([
      {
        name: 'systems',
        type: 'keyword',
        control: 'CHECKBOX_GROUP',
        defaultValue: ['api', 'database'],
      },
    ]);
    yamlDefaultsRef.current = { systems: '["api","database"]' };

    renderHook(() =>
      useFormToYamlSync(mockForm, fields, syncingFromYamlRef, yamlDefaultsRef, mockOnChange)
    );

    act(() => {
      fireSubscription({
        [CASE_EXTENDED_FIELDS]: { systems_as_keyword: '["api","database"]' },
      });
    });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  describe('DATE_PICKER serialization', () => {
    const dateFields = createParsedFields([
      {
        name: 'scheduled_at',
        type: 'date',
        control: 'DATE_PICKER',
        defaultValue: '2024-06-01T09:00:00.000Z',
      },
    ]);

    beforeEach(() => {
      yamlDefaultsRef.current = { scheduled_at: '2024-06-01T09:00:00.000Z' };
    });

    it('serializes a Moment object to a UTC ISO string', () => {
      renderHook(() =>
        useFormToYamlSync(mockForm, dateFields, syncingFromYamlRef, yamlDefaultsRef, mockOnChange)
      );

      act(() => {
        fireSubscription({
          [CASE_EXTENDED_FIELDS]: { scheduled_at_as_date: moment.utc('2024-06-15T14:30:00.000Z') },
        });
      });

      expect(mockOnChange).toHaveBeenCalledWith(
        'scheduled_at',
        '2024-06-15T14:30:00.000Z',
        'DATE_PICKER'
      );
    });

    it('converts a local-timezone Moment to UTC ISO string', () => {
      const localMoment = moment('2024-06-15T14:30:00.000').tz('America/New_York');

      renderHook(() =>
        useFormToYamlSync(mockForm, dateFields, syncingFromYamlRef, yamlDefaultsRef, mockOnChange)
      );

      act(() => {
        fireSubscription({
          [CASE_EXTENDED_FIELDS]: { scheduled_at_as_date: localMoment },
        });
      });

      const [[, isoValue]] = mockOnChange.mock.calls;
      expect(isoValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(isoValue).toBe(localMoment.utc().toISOString());
    });

    it('does not fire when Moment value matches YAML default', () => {
      renderHook(() =>
        useFormToYamlSync(mockForm, dateFields, syncingFromYamlRef, yamlDefaultsRef, mockOnChange)
      );

      act(() => {
        fireSubscription({
          [CASE_EXTENDED_FIELDS]: { scheduled_at_as_date: moment.utc('2024-06-01T09:00:00.000Z') },
        });
      });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('serializes a native Date object to an ISO string', () => {
      renderHook(() =>
        useFormToYamlSync(mockForm, dateFields, syncingFromYamlRef, yamlDefaultsRef, mockOnChange)
      );

      act(() => {
        fireSubscription({
          [CASE_EXTENDED_FIELDS]: { scheduled_at_as_date: new Date('2024-06-15T14:30:00.000Z') },
        });
      });

      expect(mockOnChange).toHaveBeenCalledWith(
        'scheduled_at',
        '2024-06-15T14:30:00.000Z',
        'DATE_PICKER'
      );
    });
  });

  it('handles multiple fields, only notifying changed ones', () => {
    const fields = createParsedFields([
      { name: 'text', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'text' },
      { name: 'number', type: 'integer', control: 'INPUT_NUMBER', defaultValue: 10 },
    ]);
    yamlDefaultsRef.current = { text: 'text', number: '10' };

    renderHook(() =>
      useFormToYamlSync(mockForm, fields, syncingFromYamlRef, yamlDefaultsRef, mockOnChange)
    );

    act(() => {
      fireSubscription({
        [CASE_EXTENDED_FIELDS]: { text_as_keyword: 'text', number_as_integer: '20' },
      });
    });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith('number', '20', 'INPUT_NUMBER');
  });
});

describe('useYamlFormSync (composed)', () => {
  let mockForm: jest.Mocked<FormHook>;
  let fireSubscription: (internal: Record<string, unknown>) => void;

  beforeEach(() => {
    ({ form: mockForm, fireSubscription } = createMockForm());
  });

  afterEach(() => jest.clearAllMocks());

  it('syncs YAML defaults to form and subscribes to form changes', () => {
    const mockOnChange = jest.fn();
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Hello' },
    ]);

    renderHook(() => useYamlFormSync(mockForm, fields, mockOnChange));

    expect(mockForm.setFieldValue).toHaveBeenCalledWith(
      `${CASE_EXTENDED_FIELDS}.summary_as_keyword`,
      'Hello'
    );
    expect(mockForm.subscribe).toHaveBeenCalled();
  });

  it('returns yamlDefaults with current values', () => {
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Default' },
      { name: 'count', type: 'integer', control: 'INPUT_NUMBER', defaultValue: 5 },
    ]);

    const { result } = renderHook(() => useYamlFormSync(mockForm, fields));

    expect(result.current.yamlDefaults).toEqual({
      summary: 'Default',
      count: '5',
    });
  });

  it('returns JSON-stringified array in yamlDefaults for CHECKBOX_GROUP', () => {
    const fields = createParsedFields([
      { name: 'systems', type: 'keyword', control: 'CHECKBOX_GROUP', defaultValue: ['api', 'ui'] },
    ]);

    const { result } = renderHook(() => useYamlFormSync(mockForm, fields));

    expect(result.current.yamlDefaults).toEqual({ systems: '["api","ui"]' });
  });

  it('updates yamlDefaults when parsedFields change', () => {
    const initial = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Initial' },
    ]);

    const { result, rerender } = renderHook(({ f }) => useYamlFormSync(mockForm, f), {
      initialProps: { f: initial },
    });

    expect(result.current.yamlDefaults.summary).toBe('Initial');

    const updated = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Updated' },
    ]);
    rerender({ f: updated });

    expect(result.current.yamlDefaults.summary).toBe('Updated');
  });

  it('returns empty object for empty parsedFields', () => {
    const { result } = renderHook(() => useYamlFormSync(mockForm, []));

    expect(mockForm.setFieldValue).not.toHaveBeenCalled();
    expect(result.current.yamlDefaults).toEqual({});
  });

  it('handles null and undefined default values', () => {
    const fields = [
      { name: 'field1', type: 'keyword', control: 'INPUT_TEXT', metadata: { default: null } },
      { name: 'field2', type: 'keyword', control: 'INPUT_TEXT', metadata: { default: undefined } },
      { name: 'field3', type: 'keyword', control: 'INPUT_TEXT', metadata: undefined },
    ] as FieldInfo[];

    const { result } = renderHook(() => useYamlFormSync(mockForm, fields));

    expect(result.current.yamlDefaults).toEqual({
      field1: '',
      field2: '',
      field3: '',
    });
  });

  it('prevents feedback loop: form subscription does not fire onFieldDefaultChange during YAML sync', () => {
    const mockOnChange = jest.fn();
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Initial' },
    ]);

    renderHook(() => useYamlFormSync(mockForm, fields, mockOnChange));

    // The subscription fires with the YAML default value — should not trigger callback
    act(() => {
      fireSubscription({
        [CASE_EXTENDED_FIELDS]: { summary_as_keyword: 'Initial' },
      });
    });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('fires onFieldDefaultChange when user changes a form value', async () => {
    const mockOnChange = jest.fn();
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Initial' },
    ]);

    renderHook(() => useYamlFormSync(mockForm, fields, mockOnChange));

    // Wait for setTimeout to clear syncingFromYamlRef
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      fireSubscription({
        [CASE_EXTENDED_FIELDS]: { summary_as_keyword: 'User changed' },
      });
    });

    expect(mockOnChange).toHaveBeenCalledWith('summary', 'User changed', 'INPUT_TEXT');
  });

  it('does NOT re-sync form fields when parsedFields re-renders with same content', () => {
    const fields = createParsedFields([
      { name: 'env', type: 'keyword', control: 'RADIO_GROUP', defaultValue: 'production' },
    ]);

    const { rerender } = renderHook(({ f }) => useYamlFormSync(mockForm, f), {
      initialProps: { f: fields },
    });

    expect(mockForm.setFieldValue).toHaveBeenCalledTimes(1);
    mockForm.setFieldValue.mockClear();

    const identical = createParsedFields([
      { name: 'env', type: 'keyword', control: 'RADIO_GROUP', defaultValue: 'production' },
    ]);
    rerender({ f: identical });

    expect(mockForm.setFieldValue).not.toHaveBeenCalled();
  });

  it('handles multiple field types with mixed changes', async () => {
    const mockOnChange = jest.fn();
    const fields = createParsedFields([
      { name: 'text', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'text' },
      { name: 'number', type: 'integer', control: 'INPUT_NUMBER', defaultValue: 10 },
      { name: 'area', type: 'keyword', control: 'TEXTAREA', defaultValue: 'area' },
      { name: 'select', type: 'keyword', control: 'SELECT_BASIC', defaultValue: 'option1' },
    ]);

    renderHook(() => useYamlFormSync(mockForm, fields, mockOnChange));

    expect(mockForm.setFieldValue).toHaveBeenCalledTimes(4);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      fireSubscription({
        [CASE_EXTENDED_FIELDS]: {
          text_as_keyword: 'text',
          number_as_integer: '20',
          area_as_keyword: 'area',
          select_as_keyword: 'option1',
        },
      });
    });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith('number', '20', 'INPUT_NUMBER');
  });

  it('handles CHECKBOX_GROUP alongside other fields, only notifying changed ones', async () => {
    const mockOnChange = jest.fn();
    const fields = createParsedFields([
      { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'text' },
      { name: 'systems', type: 'keyword', control: 'CHECKBOX_GROUP', defaultValue: ['api'] },
    ]);

    renderHook(() => useYamlFormSync(mockForm, fields, mockOnChange));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      fireSubscription({
        [CASE_EXTENDED_FIELDS]: {
          summary_as_keyword: 'text',
          systems_as_keyword: '["api","database"]',
        },
      });
    });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith('systems', '["api","database"]', 'CHECKBOX_GROUP');
  });
});
