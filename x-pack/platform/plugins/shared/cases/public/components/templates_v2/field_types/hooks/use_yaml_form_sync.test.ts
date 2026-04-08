/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import moment from 'moment-timezone';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useYamlFormSync } from './use_yaml_form_sync';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';

describe('useYamlFormSync', () => {
  let mockForm: jest.Mocked<FormHook>;
  let mockSubscriptionCallback: (data: { data: { internal: Record<string, unknown> } }) => void;
  let mockUnsubscribe: jest.Mock;

  const createMockForm = () => {
    mockUnsubscribe = jest.fn();
    return {
      setFieldValue: jest.fn(),
      subscribe: jest.fn((callback) => {
        mockSubscriptionCallback = callback;
        return { unsubscribe: mockUnsubscribe };
      }),
    } as unknown as jest.Mocked<FormHook>;
  };

  const createParsedFields = (
    fields: Array<{
      name: string;
      type: string;
      control: string;
      defaultValue?: string | number;
    }>
  ) =>
    fields.map((f) => ({
      name: f.name,
      type: f.type,
      control: f.control,
      metadata: f.defaultValue !== undefined ? { default: f.defaultValue } : undefined,
    }));

  beforeEach(() => {
    jest.useFakeTimers();
    mockForm = createMockForm();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('YAML to form sync', () => {
    it('sets form field values from parsed fields on mount', () => {
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Default text' },
        { name: 'count', type: 'integer', control: 'INPUT_NUMBER', defaultValue: 42 },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields));

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
      const parsedFields = createParsedFields([
        { name: 'effort', type: 'integer', control: 'INPUT_NUMBER', defaultValue: 100 },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields));

      expect(mockForm.setFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.effort_as_integer`,
        '100'
      );
    });

    it('sets empty string for fields without default', () => {
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT' },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields));

      expect(mockForm.setFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.summary_as_keyword`,
        ''
      );
    });

    it('updates form fields when parsedFields change', () => {
      const initialFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Initial' },
      ]);

      const { rerender } = renderHook(({ fields }) => useYamlFormSync(mockForm, fields), {
        initialProps: { fields: initialFields },
      });

      expect(mockForm.setFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.summary_as_keyword`,
        'Initial'
      );

      const updatedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Updated' },
      ]);

      rerender({ fields: updatedFields });

      expect(mockForm.setFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.summary_as_keyword`,
        'Updated'
      );
    });
  });

  describe('form to YAML sync', () => {
    it('subscribes to form changes', () => {
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT' },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields));

      expect(mockForm.subscribe).toHaveBeenCalled();
    });

    it('unsubscribes on unmount', () => {
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT' },
      ]);

      const { unmount } = renderHook(() => useYamlFormSync(mockForm, parsedFields));

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('calls onFieldDefaultChange when form value differs from YAML value', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Original' },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

      // Wait for syncingFromYamlRef to be reset
      act(() => {
        jest.advanceTimersByTime(0);
      });

      // Simulate form change
      act(() => {
        mockSubscriptionCallback({
          data: {
            internal: {
              [CASE_EXTENDED_FIELDS]: {
                summary_as_keyword: 'User typed value',
              },
            },
          },
        });
      });

      expect(mockOnFieldDefaultChange).toHaveBeenCalledWith(
        'summary',
        'User typed value',
        'INPUT_TEXT'
      );
    });

    it('does not call onFieldDefaultChange when form value matches YAML value', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Same value' },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

      // Wait for syncingFromYamlRef to be reset
      act(() => {
        jest.advanceTimersByTime(0);
      });

      // Simulate form reporting the same value as YAML
      act(() => {
        mockSubscriptionCallback({
          data: {
            internal: {
              [CASE_EXTENDED_FIELDS]: {
                summary_as_keyword: 'Same value',
              },
            },
          },
        });
      });

      expect(mockOnFieldDefaultChange).not.toHaveBeenCalled();
    });

    it('does not call onFieldDefaultChange when syncing from YAML', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'YAML value' },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

      // Do NOT advance timers - syncingFromYamlRef is still true
      // Simulate form change while syncing
      act(() => {
        mockSubscriptionCallback({
          data: {
            internal: {
              [CASE_EXTENDED_FIELDS]: {
                summary_as_keyword: 'Different value',
              },
            },
          },
        });
      });

      // Should not be called because we're still syncing from YAML
      expect(mockOnFieldDefaultChange).not.toHaveBeenCalled();
    });
  });

  describe('feedback loop prevention', () => {
    it('prevents feedback loop by ignoring form changes during YAML sync', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Initial' },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

      // Simulate subscription firing immediately after setFieldValue (before setTimeout callback)
      act(() => {
        mockSubscriptionCallback({
          data: {
            internal: {
              [CASE_EXTENDED_FIELDS]: {
                summary_as_keyword: 'Initial',
              },
            },
          },
        });
      });

      // Should not trigger callback during sync
      expect(mockOnFieldDefaultChange).not.toHaveBeenCalled();

      // Now advance timers to allow sync flag to reset
      act(() => {
        jest.advanceTimersByTime(0);
      });

      // Now form changes should trigger callback
      act(() => {
        mockSubscriptionCallback({
          data: {
            internal: {
              [CASE_EXTENDED_FIELDS]: {
                summary_as_keyword: 'User changed',
              },
            },
          },
        });
      });

      expect(mockOnFieldDefaultChange).toHaveBeenCalledWith(
        'summary',
        'User changed',
        'INPUT_TEXT'
      );
    });
  });

  describe('return value', () => {
    it('returns current yamlDefaults', () => {
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Default' },
        { name: 'count', type: 'integer', control: 'INPUT_NUMBER', defaultValue: 5 },
      ]);

      const { result } = renderHook(() => useYamlFormSync(mockForm, parsedFields));

      expect(result.current.yamlDefaults).toEqual({
        summary: 'Default',
        count: '5',
      });
    });

    it('updates yamlDefaults when parsedFields change', () => {
      const initialFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Initial' },
      ]);

      const { result, rerender } = renderHook(({ fields }) => useYamlFormSync(mockForm, fields), {
        initialProps: { fields: initialFields },
      });

      expect(result.current.yamlDefaults.summary).toBe('Initial');

      const updatedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Updated' },
      ]);

      rerender({ fields: updatedFields });

      expect(result.current.yamlDefaults.summary).toBe('Updated');
    });
  });

  describe('edge cases', () => {
    it('handles empty parsedFields array', () => {
      const { result } = renderHook(() => useYamlFormSync(mockForm, []));

      expect(mockForm.setFieldValue).not.toHaveBeenCalled();
      expect(result.current.yamlDefaults).toEqual({});
    });

    it('handles undefined onFieldDefaultChange callback', () => {
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Value' },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, undefined));

      act(() => {
        jest.advanceTimersByTime(0);
      });

      // Should not throw when callback is undefined
      expect(() => {
        act(() => {
          mockSubscriptionCallback({
            data: {
              internal: {
                [CASE_EXTENDED_FIELDS]: {
                  summary_as_keyword: 'Changed',
                },
              },
            },
          });
        });
      }).not.toThrow();
    });

    it('handles missing extendedFields in form data', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT' },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

      act(() => {
        jest.advanceTimersByTime(0);
      });

      // Simulate form data without extendedFields
      act(() => {
        mockSubscriptionCallback({
          data: {
            internal: {},
          },
        });
      });

      expect(mockOnFieldDefaultChange).not.toHaveBeenCalled();
    });

    it('handles null and undefined default values', () => {
      const parsedFields = [
        { name: 'field1', type: 'keyword', control: 'INPUT_TEXT', metadata: { default: null } },
        {
          name: 'field2',
          type: 'keyword',
          control: 'INPUT_TEXT',
          metadata: { default: undefined },
        },
        { name: 'field3', type: 'keyword', control: 'INPUT_TEXT', metadata: undefined },
      ];

      const { result } = renderHook(() =>
        useYamlFormSync(mockForm, parsedFields as Parameters<typeof useYamlFormSync>[1])
      );

      expect(result.current.yamlDefaults).toEqual({
        field1: '',
        field2: '',
        field3: '',
      });
    });

    it('handles multiple fields with different controls including DATE_PICKER', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        { name: 'text', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'text' },
        { name: 'number', type: 'integer', control: 'INPUT_NUMBER', defaultValue: 10 },
        { name: 'area', type: 'keyword', control: 'TEXTAREA', defaultValue: 'area' },
        { name: 'select', type: 'keyword', control: 'SELECT_BASIC', defaultValue: 'option1' },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

      expect(mockForm.setFieldValue).toHaveBeenCalledTimes(4);

      act(() => {
        jest.advanceTimersByTime(0);
      });

      // Change the number field
      act(() => {
        mockSubscriptionCallback({
          data: {
            internal: {
              [CASE_EXTENDED_FIELDS]: {
                text_as_keyword: 'text',
                number_as_integer: '20',
                area_as_keyword: 'area',
                select_as_keyword: 'option1',
              },
            },
          },
        });
      });

      expect(mockOnFieldDefaultChange).toHaveBeenCalledWith('number', '20', 'INPUT_NUMBER');
      expect(mockOnFieldDefaultChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('DATE_PICKER serialization', () => {
    const dateField = [
      {
        name: 'scheduled_at',
        type: 'date',
        control: 'DATE_PICKER',
        defaultValue: '2024-06-01T09:00:00.000Z',
      },
    ];

    it('serializes a Moment object to a UTC ISO string', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields(dateField);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

      act(() => {
        jest.advanceTimersByTime(0);
      });

      const momentValue = moment.utc('2024-06-15T14:30:00.000Z');

      act(() => {
        mockSubscriptionCallback({
          data: {
            internal: {
              [CASE_EXTENDED_FIELDS]: {
                scheduled_at_as_date: momentValue,
              },
            },
          },
        });
      });

      expect(mockOnFieldDefaultChange).toHaveBeenCalledWith(
        'scheduled_at',
        '2024-06-15T14:30:00.000Z',
        'DATE_PICKER'
      );
    });

    it('converts a local-timezone Moment to UTC ISO string', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields(dateField);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

      act(() => {
        jest.advanceTimersByTime(0);
      });

      // Moment in a non-UTC timezone — should still serialize as UTC
      const localMoment = moment('2024-06-15T14:30:00.000').tz('America/New_York');

      act(() => {
        mockSubscriptionCallback({
          data: {
            internal: {
              [CASE_EXTENDED_FIELDS]: {
                scheduled_at_as_date: localMoment,
              },
            },
          },
        });
      });

      const [[, isoValue]] = mockOnFieldDefaultChange.mock.calls;
      expect(isoValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(isoValue).toBe(localMoment.utc().toISOString());
    });

    it('does not call onFieldDefaultChange when Moment value matches YAML default', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields(dateField);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

      act(() => {
        jest.advanceTimersByTime(0);
      });

      // Moment that serializes to the same value as the YAML default
      const momentValue = moment.utc('2024-06-01T09:00:00.000Z');

      act(() => {
        mockSubscriptionCallback({
          data: {
            internal: {
              [CASE_EXTENDED_FIELDS]: {
                scheduled_at_as_date: momentValue,
              },
            },
          },
        });
      });

      expect(mockOnFieldDefaultChange).not.toHaveBeenCalled();
    });

    it('serializes a native Date object to an ISO string', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields(dateField);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

      act(() => {
        jest.advanceTimersByTime(0);
      });

      const dateValue = new Date('2024-06-15T14:30:00.000Z');

      act(() => {
        mockSubscriptionCallback({
          data: {
            internal: {
              [CASE_EXTENDED_FIELDS]: {
                scheduled_at_as_date: dateValue,
              },
            },
          },
        });
      });

      expect(mockOnFieldDefaultChange).toHaveBeenCalledWith(
        'scheduled_at',
        '2024-06-15T14:30:00.000Z',
        'DATE_PICKER'
      );
    });
  });
});
