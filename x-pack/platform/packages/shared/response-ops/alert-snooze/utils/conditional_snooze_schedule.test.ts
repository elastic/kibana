/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  buildTimeChipLabel,
  buildPreviewSentences,
  buildConditionalSnoozeSchedule,
} from './conditional_snooze_schedule';
import type { DataConditionEntry, DataConditionTypeDescriptor } from '../components/types';
import { DataConditionType } from '../components/types';
import type { TimeConditionState } from '../components/time_condition_panel';

const severityChangeDescriptor: DataConditionTypeDescriptor = {
  id: DataConditionType.SEVERITY_CHANGE,
  label: 'Severity change',
  isComplete: () => true,
  renderInput: () => null,
  renderConfirmedSummary: () => null,
  getPreviewText: () => 'severity is changed',
  serialize: () => ({ type: DataConditionType.SEVERITY_CHANGE }),
};

const fieldChangeDescriptor: DataConditionTypeDescriptor = {
  id: DataConditionType.FIELD_CHANGE,
  label: 'Field change',
  isComplete: (entry) => !!entry.field,
  renderInput: () => null,
  renderConfirmedSummary: () => null,
  getPreviewText: (entry) => `field "${entry.field}" is changed`,
  serialize: (entry) => ({ type: DataConditionType.FIELD_CHANGE, field: entry.field }),
};

const descriptorById = new Map<string, DataConditionTypeDescriptor>([
  [severityChangeDescriptor.id, severityChangeDescriptor],
  [fieldChangeDescriptor.id, fieldChangeDescriptor],
]);

const baseEntry = (overrides: Partial<DataConditionEntry> = {}): DataConditionEntry => ({
  id: 'dc-1',
  type: DataConditionType.SEVERITY_CHANGE,
  field: '',
  value: 'critical',
  confirmed: true,
  ...overrides,
});

describe('buildTimeChipLabel', () => {
  it('returns empty string when there is no time condition', () => {
    expect(buildTimeChipLabel(null)).toBe('');
  });

  it('formats a date-time picker selection', () => {
    const dateTime = moment('2026-05-20T04:00:00Z');
    const state: TimeConditionState = {
      status: 'confirmed',
      mode: 'datetime',
      value: 1,
      unit: 'h',
      dateTime,
    };
    expect(buildTimeChipLabel(state)).toBe(dateTime.format('MMM D, YYYY [at] h:mm A'));
  });

  it('returns empty string for date-time mode with no selection', () => {
    const state: TimeConditionState = {
      status: 'editing',
      mode: 'datetime',
      value: 1,
      unit: 'h',
      dateTime: null,
    };
    expect(buildTimeChipLabel(state)).toBe('');
  });

  it('formats a duration ("After N <unit>")', () => {
    const state: TimeConditionState = {
      status: 'confirmed',
      mode: 'duration',
      value: 2,
      unit: 'h',
      dateTime: null,
    };
    expect(buildTimeChipLabel(state)).toBe('After 2 hours');
  });
});

describe('buildPreviewSentences', () => {
  it('returns the footer hint when there is nothing confirmed', () => {
    expect(
      buildPreviewSentences({
        confirmedDataConditions: [],
        descriptorById,
        conditionOperator: 'any',
        timeEndDate: null,
      })
    ).toEqual(['Add conditions to define when the alert will un-snooze.']);
  });

  it('formats a single confirmed data condition', () => {
    expect(
      buildPreviewSentences({
        confirmedDataConditions: [baseEntry({ type: DataConditionType.SEVERITY_CHANGE })],
        descriptorById,
        conditionOperator: 'any',
        timeEndDate: null,
      })
    ).toEqual(['Alert will unsnooze if severity is changed.']);
  });

  it('joins multiple data conditions with OR when operator is "any"', () => {
    expect(
      buildPreviewSentences({
        confirmedDataConditions: [
          baseEntry({ id: 'dc-1', type: DataConditionType.SEVERITY_CHANGE }),
          baseEntry({ id: 'dc-2', type: DataConditionType.FIELD_CHANGE, field: 'status' }),
        ],
        descriptorById,
        conditionOperator: 'any',
        timeEndDate: null,
      })
    ).toEqual(['Alert will unsnooze if severity is changed or field "status" is changed.']);
  });

  it('joins multiple data conditions with AND when operator is "all"', () => {
    expect(
      buildPreviewSentences({
        confirmedDataConditions: [
          baseEntry({ id: 'dc-1', type: DataConditionType.SEVERITY_CHANGE }),
          baseEntry({ id: 'dc-2', type: DataConditionType.FIELD_CHANGE, field: 'status' }),
        ],
        descriptorById,
        conditionOperator: 'all',
        timeEndDate: null,
      })
    ).toEqual(['Alert will unsnooze if severity is changed and field "status" is changed.']);
  });

  it('renders time-only "Alert will unsnooze on <date>"', () => {
    const expiresAt = moment('2026-05-20T04:00:00Z').toISOString();
    const expected = moment(expiresAt).format('MMM D, YYYY [at] h:mm A');
    expect(
      buildPreviewSentences({
        confirmedDataConditions: [],
        descriptorById,
        conditionOperator: 'any',
        timeEndDate: expiresAt,
      })
    ).toEqual([`Alert will unsnooze on ${expected}`]);
  });

  it('combines data conditions and time into a single sentence', () => {
    const expiresAt = moment('2026-05-20T04:00:00Z').toISOString();
    const expected = moment(expiresAt).format('MMM D, YYYY [at] h:mm A');
    expect(
      buildPreviewSentences({
        confirmedDataConditions: [baseEntry({ type: DataConditionType.SEVERITY_CHANGE })],
        descriptorById,
        conditionOperator: 'any',
        timeEndDate: expiresAt,
      })
    ).toEqual([`Alert will unsnooze if severity is changed, OR on ${expected}.`]);
  });

  it('falls back to the raw type id when no descriptor is registered', () => {
    expect(
      buildPreviewSentences({
        confirmedDataConditions: [baseEntry({ type: 'unknown_type' as DataConditionType })],
        descriptorById,
        conditionOperator: 'any',
        timeEndDate: null,
      })
    ).toEqual(['Alert will unsnooze if unknown_type.']);
  });
});

describe('buildConditionalSnoozeSchedule', () => {
  it('returns undefined when nothing is valid', () => {
    expect(
      buildConditionalSnoozeSchedule({
        hasConfirmedTimeCondition: false,
        timeEndDate: null,
        dataConditions: [],
        descriptorById,
        conditionOperator: 'any',
      })
    ).toBeUndefined();
  });

  it('returns undefined when only the time condition is "confirmed" but has no resolved end date', () => {
    expect(
      buildConditionalSnoozeSchedule({
        hasConfirmedTimeCondition: true,
        timeEndDate: null,
        dataConditions: [],
        descriptorById,
        conditionOperator: 'any',
      })
    ).toBeUndefined();
  });

  it('emits an expiresAt-only schedule when only a time condition is confirmed', () => {
    const expiresAt = '2026-05-20T04:00:00.000Z';
    expect(
      buildConditionalSnoozeSchedule({
        hasConfirmedTimeCondition: true,
        timeEndDate: expiresAt,
        dataConditions: [],
        descriptorById,
        conditionOperator: 'any',
      })
    ).toEqual({ expiresAt });
  });

  it('emits a conditions-only schedule when only data conditions are confirmed', () => {
    expect(
      buildConditionalSnoozeSchedule({
        hasConfirmedTimeCondition: false,
        timeEndDate: null,
        dataConditions: [baseEntry({ type: DataConditionType.SEVERITY_CHANGE })],
        descriptorById,
        conditionOperator: 'any',
      })
    ).toEqual({
      conditions: [{ type: DataConditionType.SEVERITY_CHANGE }],
      conditionOperator: 'any',
    });
  });

  it('omits unconfirmed data conditions from the emitted schedule', () => {
    expect(
      buildConditionalSnoozeSchedule({
        hasConfirmedTimeCondition: false,
        timeEndDate: null,
        dataConditions: [
          baseEntry({ id: 'dc-1', type: DataConditionType.SEVERITY_CHANGE }),
          baseEntry({
            id: 'dc-2',
            type: DataConditionType.FIELD_CHANGE,
            field: 'status',
            confirmed: false,
          }),
        ],
        descriptorById,
        conditionOperator: 'any',
      })
    ).toEqual({
      conditions: [{ type: DataConditionType.SEVERITY_CHANGE }],
      conditionOperator: 'any',
    });
  });

  it('drops entries whose descriptor is no longer registered', () => {
    expect(
      buildConditionalSnoozeSchedule({
        hasConfirmedTimeCondition: false,
        timeEndDate: null,
        dataConditions: [
          baseEntry({ id: 'dc-1', type: DataConditionType.SEVERITY_CHANGE }),
          baseEntry({ id: 'dc-2', type: 'unknown_type' as DataConditionType }),
        ],
        descriptorById,
        conditionOperator: 'any',
      })
    ).toEqual({
      conditions: [{ type: DataConditionType.SEVERITY_CHANGE }],
      conditionOperator: 'any',
    });
  });

  it('combines expiresAt, conditions, and operator when both parts are present', () => {
    const expiresAt = '2026-05-20T04:00:00.000Z';
    expect(
      buildConditionalSnoozeSchedule({
        hasConfirmedTimeCondition: true,
        timeEndDate: expiresAt,
        dataConditions: [
          baseEntry({ id: 'dc-1', type: DataConditionType.SEVERITY_CHANGE }),
          baseEntry({ id: 'dc-2', type: DataConditionType.FIELD_CHANGE, field: 'host.name' }),
        ],
        descriptorById,
        conditionOperator: 'all',
      })
    ).toEqual({
      expiresAt,
      conditions: [
        { type: DataConditionType.SEVERITY_CHANGE },
        { type: DataConditionType.FIELD_CHANGE, field: 'host.name' },
      ],
      conditionOperator: 'all',
    });
  });
});
