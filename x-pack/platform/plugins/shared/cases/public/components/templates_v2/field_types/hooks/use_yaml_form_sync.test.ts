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
import type { FieldDefaultValue } from '../../utils/update_yaml_field_default';

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
      defaultValue?: FieldDefaultValue;
    }>
  ) =>
    fields.map((f) => ({
      name: f.name,
      type: f.type,
      control: f.control,
      metadata: f.defaultValue !== undefined ? { default: f.defaultValue } : undefined,
    }));

  beforeEach(() => {
    mockForm = createMockForm();
  });

  afterEach(() => {
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

    it('sets form field to a JSON string when YAML default is an array (CHECKBOX_GROUP)', () => {
      const parsedFields = createParsedFields([
        {
          name: 'systems',
          type: 'keyword',
          control: 'CHECKBOX_GROUP',
          defaultValue: ['api', 'database'],
        },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields));

      expect(mockForm.setFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.systems_as_keyword`,
        '["api","database"]'
      );
    });

    it('sets form field to empty JSON array string when YAML default is an empty array', () => {
      const parsedFields = createParsedFields([
        { name: 'systems', type: 'keyword', control: 'CHECKBOX_GROUP', defaultValue: [] },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields));

      expect(mockForm.setFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.systems_as_keyword`,
        '[]'
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

    it('calls onFieldDefaultChange with JSON string when CHECKBOX_GROUP value changes', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        {
          name: 'systems',
          type: 'keyword',
          control: 'CHECKBOX_GROUP',
          defaultValue: ['api'],
        },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

      act(() => {
        mockSubscriptionCallback({
          data: {
            internal: {
              [CASE_EXTENDED_FIELDS]: {
                systems_as_keyword: '["api","database"]',
              },
            },
          },
        });
      });

      expect(mockOnFieldDefaultChange).toHaveBeenCalledWith(
        'systems',
        '["api","database"]',
        'CHECKBOX_GROUP'
      );
    });

    it('does not call onFieldDefaultChange when CHECKBOX_GROUP JSON string matches YAML array', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        {
          name: 'systems',
          type: 'keyword',
          control: 'CHECKBOX_GROUP',
          defaultValue: ['api', 'database'],
        },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

      act(() => {
        mockSubscriptionCallback({
          data: {
            internal: {
              [CASE_EXTENDED_FIELDS]: {
                systems_as_keyword: '["api","database"]',
              },
            },
          },
        });
      });

      expect(mockOnFieldDefaultChange).not.toHaveBeenCalled();
    });

    it('serializes a raw array rawValue to JSON string before comparing (Array.isArray branch)', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        {
          name: 'systems',
          type: 'keyword',
          control: 'CHECKBOX_GROUP',
          defaultValue: ['api'],
        },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

      act(() => {
        mockSubscriptionCallback({
          data: {
            internal: {
              [CASE_EXTENDED_FIELDS]: {
                systems_as_keyword: ['api', 'ui'],
              },
            },
          },
        });
      });

      // Raw array ['api','ui'] → '["api","ui"]' which differs from '["api"]'
      expect(mockOnFieldDefaultChange).toHaveBeenCalledWith(
        'systems',
        '["api","ui"]',
        'CHECKBOX_GROUP'
      );
    });
  });

  describe('feedback loop prevention', () => {
    it('does not call onFieldDefaultChange when subscription fires with the YAML default value (no bounce-back)', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Initial' },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

      // Subscription fires with exactly the YAML default — no callback expected
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

      expect(mockOnFieldDefaultChange).not.toHaveBeenCalled();
    });

    it('calls onFieldDefaultChange when subscription fires with a value that differs from YAML default', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'Initial' },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

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

    it('does NOT call setFieldValue again when parsedFields re-renders with the same content (user selection preserved)', () => {
      const parsedFields = createParsedFields([
        {
          name: 'environment',
          type: 'keyword',
          control: 'RADIO_GROUP',
          defaultValue: 'production',
        },
      ]);

      const { rerender } = renderHook(({ fields }) => useYamlFormSync(mockForm, fields), {
        initialProps: { fields: parsedFields },
      });

      // Initial mount syncs the YAML default
      expect(mockForm.setFieldValue).toHaveBeenCalledTimes(1);
      expect(mockForm.setFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.environment_as_keyword`,
        'production'
      );

      mockForm.setFieldValue.mockClear();

      // Re-render with a new array reference but identical content (e.g. from re-parsing same YAML)
      const identicalFields = createParsedFields([
        {
          name: 'environment',
          type: 'keyword',
          control: 'RADIO_GROUP',
          defaultValue: 'production',
        },
      ]);
      expect(identicalFields).not.toBe(parsedFields);

      rerender({ fields: identicalFields });

      // setFieldValue must NOT be called again — user's UI selection must be preserved
      expect(mockForm.setFieldValue).not.toHaveBeenCalled();
    });

    it('calls setFieldValue when the YAML default genuinely changes (e.g. user edits YAML)', () => {
      const parsedFields = createParsedFields([
        {
          name: 'environment',
          type: 'keyword',
          control: 'RADIO_GROUP',
          defaultValue: 'production',
        },
      ]);

      const { rerender } = renderHook(({ fields }) => useYamlFormSync(mockForm, fields), {
        initialProps: { fields: parsedFields },
      });

      mockForm.setFieldValue.mockClear();

      const updatedFields = createParsedFields([
        { name: 'environment', type: 'keyword', control: 'RADIO_GROUP', defaultValue: 'staging' },
      ]);

      rerender({ fields: updatedFields });

      expect(mockForm.setFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.environment_as_keyword`,
        'staging'
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

    it('returns yamlDefaults with JSON-stringified array for CHECKBOX_GROUP', () => {
      const parsedFields = createParsedFields([
        {
          name: 'systems',
          type: 'keyword',
          control: 'CHECKBOX_GROUP',
          defaultValue: ['api', 'ui'],
        },
      ]);

      const { result } = renderHook(() => useYamlFormSync(mockForm, parsedFields));

      expect(result.current.yamlDefaults).toEqual({
        systems: '["api","ui"]',
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

    it('handles CHECKBOX_GROUP alongside other field types, only notifying changed fields', () => {
      const mockOnFieldDefaultChange = jest.fn();
      const parsedFields = createParsedFields([
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', defaultValue: 'text' },
        {
          name: 'systems',
          type: 'keyword',
          control: 'CHECKBOX_GROUP',
          defaultValue: ['api'],
        },
      ]);

      renderHook(() => useYamlFormSync(mockForm, parsedFields, mockOnFieldDefaultChange));

      // Only the checkbox group changes
      act(() => {
        mockSubscriptionCallback({
          data: {
            internal: {
              [CASE_EXTENDED_FIELDS]: {
                summary_as_keyword: 'text',
                systems_as_keyword: '["api","database"]',
              },
            },
          },
        });
      });

      expect(mockOnFieldDefaultChange).toHaveBeenCalledTimes(1);
      expect(mockOnFieldDefaultChange).toHaveBeenCalledWith(
        'systems',
        '["api","database"]',
        'CHECKBOX_GROUP'
      );
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
