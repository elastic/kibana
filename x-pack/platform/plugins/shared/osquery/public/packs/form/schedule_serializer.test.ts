/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Weekday } from '@kbn/rrule';

import {
  DEFAULT_SCHEDULE_FORM_VALUES,
  type ScheduleFormData,
} from '../../components/schedule_section';
import {
  deserializeSchedule,
  getDefaultScheduleFormValues,
  serializeSchedule,
} from './schedule_serializer';

const buildForm = (overrides: Partial<ScheduleFormData> = {}): ScheduleFormData => ({
  ...DEFAULT_SCHEDULE_FORM_VALUES,
  ...overrides,
});

describe('serializeSchedule', () => {
  describe('interval mode', () => {
    it('emits schedule_type and the active interval value', () => {
      expect(serializeSchedule(buildForm({ schedule_type: 'interval', interval: 1800 }))).toEqual({
        schedule_type: 'interval',
        interval: 1800,
      });
    });

    it('does not emit any rrule fields in interval mode', () => {
      const result = serializeSchedule(
        buildForm({
          schedule_type: 'interval',
          interval: 60,
          // RRULE-mode-only fields that should be ignored when schedule_type is interval.
          frequency: 'custom',
          byweekday: [Weekday.MO, Weekday.WE],
          start_date: '2024-01-01T00:00:00.000Z',
          splay_enabled: true,
          splay_value: 30,
          splay_unit: 'seconds',
        })
      );

      expect(result).not.toHaveProperty('rrule_schedule');
    });
  });

  describe('rrule mode — frequency mapping', () => {
    const baseRruleForm: Partial<ScheduleFormData> = {
      schedule_type: 'rrule',
      start_date: '2024-01-01T00:00:00.000Z',
    };

    it('serializes daily as bare FREQ=DAILY (INTERVAL=1 omitted)', () => {
      const result = serializeSchedule(buildForm({ ...baseRruleForm, frequency: 'daily' }));
      expect(result.schedule_type).toBe('rrule');
      expect(result.rrule_schedule?.rrule).toBe('FREQ=DAILY');
    });

    it('serializes hourly with repeat_every as INTERVAL', () => {
      const result = serializeSchedule(
        buildForm({ ...baseRruleForm, frequency: 'hourly', repeat_every: 4 })
      );
      expect(result.rrule_schedule?.rrule).toBe('FREQ=HOURLY;INTERVAL=4');
    });

    it('serializes minutely with repeat_every', () => {
      const result = serializeSchedule(
        buildForm({ ...baseRruleForm, frequency: 'minutely', repeat_every: 15 })
      );
      expect(result.rrule_schedule?.rrule).toBe('FREQ=MINUTELY;INTERVAL=15');
    });

    it('serializes custom (weekly) with BYDAY in stable order', () => {
      const result = serializeSchedule(
        buildForm({
          ...baseRruleForm,
          frequency: 'custom',
          byweekday: [Weekday.MO, Weekday.WE, Weekday.FR],
          repeat_every: 2,
        })
      );
      expect(result.rrule_schedule?.rrule).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR');
    });

    it('serializes custom (weekly) without INTERVAL when repeat_every is the RFC default', () => {
      const result = serializeSchedule(
        buildForm({
          ...baseRruleForm,
          frequency: 'custom',
          byweekday: [Weekday.SA, Weekday.SU],
          repeat_every: 1,
        })
      );
      expect(result.rrule_schedule?.rrule).toBe('FREQ=WEEKLY;BYDAY=SA,SU');
    });

    it('serializes monthly with BYMONTHDAY', () => {
      const result = serializeSchedule(
        buildForm({ ...baseRruleForm, frequency: 'monthly', bymonthday: 15, repeat_every: 1 })
      );
      expect(result.rrule_schedule?.rrule).toBe('FREQ=MONTHLY;BYMONTHDAY=15');
    });

    it('serializes yearly with BYMONTH and BYMONTHDAY', () => {
      const result = serializeSchedule(
        buildForm({
          ...baseRruleForm,
          frequency: 'yearly',
          bymonth: 6,
          bymonthday: 15,
          repeat_every: 1,
        })
      );
      expect(result.rrule_schedule?.rrule).toBe('FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15');
    });
  });

  describe('rrule mode — start_date / end_date / splay', () => {
    const baseRruleForm: Partial<ScheduleFormData> = {
      schedule_type: 'rrule',
      frequency: 'daily',
      start_date: '2024-03-01T00:00:00.000Z',
    };

    it('always includes start_date', () => {
      const result = serializeSchedule(buildForm(baseRruleForm));
      expect(result.rrule_schedule?.start_date).toBe('2024-03-01T00:00:00.000Z');
    });

    it('omits end_date when end_date_enabled is false', () => {
      const result = serializeSchedule(
        buildForm({
          ...baseRruleForm,
          end_date_enabled: false,
          end_date: '2024-12-31T00:00:00.000Z',
        })
      );
      expect(result.rrule_schedule).not.toHaveProperty('end_date');
    });

    it('includes end_date when end_date_enabled is true', () => {
      const result = serializeSchedule(
        buildForm({
          ...baseRruleForm,
          end_date_enabled: true,
          end_date: '2024-12-31T00:00:00.000Z',
        })
      );
      expect(result.rrule_schedule?.end_date).toBe('2024-12-31T00:00:00.000Z');
    });

    it('omits splay when splay_enabled is false', () => {
      const result = serializeSchedule(
        buildForm({
          ...baseRruleForm,
          splay_enabled: false,
          splay_value: 10,
          splay_unit: 'seconds',
        })
      );
      expect(result.rrule_schedule).not.toHaveProperty('splay');
    });

    it('serializes splay as a single-unit Go duration when enabled', () => {
      expect(
        serializeSchedule(
          buildForm({
            ...baseRruleForm,
            splay_enabled: true,
            splay_value: 30,
            splay_unit: 'seconds',
          })
        ).rrule_schedule?.splay
      ).toBe('30s');

      expect(
        serializeSchedule(
          buildForm({
            ...baseRruleForm,
            splay_enabled: true,
            splay_value: 5,
            splay_unit: 'minutes',
          })
        ).rrule_schedule?.splay
      ).toBe('5m');

      expect(
        serializeSchedule(
          buildForm({
            ...baseRruleForm,
            splay_enabled: true,
            splay_value: 1,
            splay_unit: 'hours',
          })
        ).rrule_schedule?.splay
      ).toBe('1h');
    });
  });
});

describe('deserializeSchedule', () => {
  it('returns interval defaults when no API fields are present', () => {
    expect(deserializeSchedule({})).toEqual({
      ...DEFAULT_SCHEDULE_FORM_VALUES,
      schedule_type: 'interval',
      interval: DEFAULT_SCHEDULE_FORM_VALUES.interval,
    });
  });

  it('preserves a legacy interval value', () => {
    const result = deserializeSchedule({ schedule_type: 'interval', interval: 7200 });
    expect(result.schedule_type).toBe('interval');
    expect(result.interval).toBe(7200);
  });

  it('parses a daily rrule schedule into form fields', () => {
    const result = deserializeSchedule({
      schedule_type: 'rrule',
      rrule_schedule: {
        rrule: 'FREQ=DAILY',
        start_date: '2024-04-01T00:00:00.000Z',
      },
    });

    expect(result).toMatchObject({
      schedule_type: 'rrule',
      frequency: 'daily',
      start_date: '2024-04-01T00:00:00.000Z',
      end_date_enabled: false,
      end_date: '',
      splay_enabled: false,
    });
  });

  it('parses a weekly rrule with BYDAY into custom frequency + byweekday', () => {
    const result = deserializeSchedule({
      schedule_type: 'rrule',
      rrule_schedule: {
        rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=2',
        start_date: '2024-04-01T00:00:00.000Z',
      },
    });

    expect(result.frequency).toBe('custom');
    expect(result.byweekday).toEqual([Weekday.MO, Weekday.WE, Weekday.FR]);
    expect(result.repeat_every).toBe(2);
  });

  it('flips end_date_enabled when end_date is present', () => {
    const result = deserializeSchedule({
      schedule_type: 'rrule',
      rrule_schedule: {
        rrule: 'FREQ=DAILY',
        start_date: '2024-04-01T00:00:00.000Z',
        end_date: '2024-12-31T00:00:00.000Z',
      },
    });

    expect(result.end_date_enabled).toBe(true);
    expect(result.end_date).toBe('2024-12-31T00:00:00.000Z');
  });

  it('parses a single-unit splay duration into value + unit', () => {
    const result = deserializeSchedule({
      schedule_type: 'rrule',
      rrule_schedule: {
        rrule: 'FREQ=DAILY',
        start_date: '2024-04-01T00:00:00.000Z',
        splay: '5m',
      },
    });

    expect(result.splay_enabled).toBe(true);
    expect(result.splay_value).toBe(5);
    expect(result.splay_unit).toBe('minutes');
  });

  it('preserves compound splay durations as splay_raw and keeps splay enabled', () => {
    const result = deserializeSchedule({
      schedule_type: 'rrule',
      rrule_schedule: {
        rrule: 'FREQ=DAILY',
        start_date: '2024-04-01T00:00:00.000Z',
        splay: '1h30m',
      },
    });

    expect(result.splay_enabled).toBe(true);
    expect(result.splay_raw).toBe('1h30m');
    expect(result.splay_value).toBe(DEFAULT_SCHEDULE_FORM_VALUES.splay_value);
    expect(result.splay_unit).toBe(DEFAULT_SCHEDULE_FORM_VALUES.splay_unit);
  });

  it('falls back to splay disabled when the duration string is unparseable', () => {
    const result = deserializeSchedule({
      schedule_type: 'rrule',
      rrule_schedule: {
        rrule: 'FREQ=DAILY',
        start_date: '2024-04-01T00:00:00.000Z',
        splay: 'not-a-duration',
      },
    });

    expect(result.splay_enabled).toBe(false);
  });
});

describe('compound splay round-trip (D16)', () => {
  it('round-trips "1h30m" through deserialize → serialize unchanged', () => {
    const api = {
      schedule_type: 'rrule' as const,
      rrule_schedule: {
        rrule: 'FREQ=DAILY',
        start_date: '2024-04-01T00:00:00.000Z',
        splay: '1h30m',
      },
    };

    const form = deserializeSchedule(api);
    const result = serializeSchedule(form);

    expect(result.rrule_schedule?.splay).toBe('1h30m');
  });

  it('round-trips "45m30s" through deserialize → serialize unchanged', () => {
    const api = {
      schedule_type: 'rrule' as const,
      rrule_schedule: {
        rrule: 'FREQ=DAILY',
        start_date: '2024-04-01T00:00:00.000Z',
        splay: '45m30s',
      },
    };

    const form = deserializeSchedule(api);
    const result = serializeSchedule(form);

    expect(result.rrule_schedule?.splay).toBe('45m30s');
  });

  it('once splay_raw is cleared (user edited), serializer emits the form value', () => {
    const api = {
      schedule_type: 'rrule' as const,
      rrule_schedule: {
        rrule: 'FREQ=DAILY',
        start_date: '2024-04-01T00:00:00.000Z',
        splay: '1h30m',
      },
    };

    const form = deserializeSchedule(api);
    const edited: ScheduleFormData = {
      ...form,
      splay_raw: undefined,
      splay_value: 10,
      splay_unit: 'minutes',
    };

    const result = serializeSchedule(edited);

    expect(result.rrule_schedule?.splay).toBe('10m');
  });
});

describe('serialize → deserialize round-trip', () => {
  const cases: Array<{ name: string; form: ScheduleFormData }> = [
    {
      name: 'interval mode',
      form: {
        ...DEFAULT_SCHEDULE_FORM_VALUES,
        schedule_type: 'interval',
        interval: 900,
      },
    },
    {
      name: 'rrule daily',
      form: {
        ...DEFAULT_SCHEDULE_FORM_VALUES,
        schedule_type: 'rrule',
        frequency: 'daily',
        start_date: '2024-05-01T00:00:00.000Z',
      },
    },
    {
      name: 'rrule weekly with byweekday + interval',
      form: {
        ...DEFAULT_SCHEDULE_FORM_VALUES,
        schedule_type: 'rrule',
        frequency: 'custom',
        byweekday: [Weekday.MO, Weekday.WE, Weekday.FR],
        repeat_every: 2,
        start_date: '2024-05-01T00:00:00.000Z',
      },
    },
    {
      name: 'rrule monthly with bymonthday',
      form: {
        ...DEFAULT_SCHEDULE_FORM_VALUES,
        schedule_type: 'rrule',
        frequency: 'monthly',
        bymonthday: 15,
        start_date: '2024-05-01T00:00:00.000Z',
      },
    },
    {
      name: 'rrule yearly with end_date and splay',
      form: {
        ...DEFAULT_SCHEDULE_FORM_VALUES,
        schedule_type: 'rrule',
        frequency: 'yearly',
        bymonth: 6,
        bymonthday: 15,
        start_date: '2024-05-01T00:00:00.000Z',
        end_date_enabled: true,
        end_date: '2025-05-01T00:00:00.000Z',
        splay_enabled: true,
        splay_value: 30,
        splay_unit: 'minutes',
      },
    },
  ];

  it.each(cases)('preserves the user-facing fields for $name', ({ form }) => {
    const api = serializeSchedule(form);
    const back = deserializeSchedule(api);

    if (form.schedule_type === 'interval') {
      expect(back.schedule_type).toBe('interval');
      expect(back.interval).toBe(form.interval);

      return;
    }

    expect(back).toMatchObject({
      schedule_type: 'rrule',
      frequency: form.frequency,
      start_date: form.start_date,
      end_date_enabled: form.end_date_enabled,
      end_date: form.end_date_enabled ? form.end_date : '',
      splay_enabled: form.splay_enabled,
    });

    if (form.frequency === 'custom') {
      expect(back.byweekday).toEqual(form.byweekday);
      expect(back.repeat_every).toBe(form.repeat_every);
    }

    if (form.frequency === 'monthly' || form.frequency === 'yearly') {
      expect(back.bymonthday).toBe(form.bymonthday);
    }

    if (form.frequency === 'yearly') {
      expect(back.bymonth).toBe(form.bymonth);
    }

    if (form.splay_enabled) {
      expect(back.splay_value).toBe(form.splay_value);
      expect(back.splay_unit).toBe(form.splay_unit);
    }
  });
});

describe('getDefaultScheduleFormValues', () => {
  it('seeds start_date with a current ISO timestamp', () => {
    const before = Date.now();
    const values = getDefaultScheduleFormValues();
    const after = Date.now();

    const startMs = Date.parse(values.start_date);
    expect(Number.isFinite(startMs)).toBe(true);
    expect(startMs).toBeGreaterThanOrEqual(before);
    expect(startMs).toBeLessThanOrEqual(after);
  });

  it('returns the static defaults for every other field', () => {
    const values = getDefaultScheduleFormValues();
    const { start_date: _ignored, ...rest } = values;
    const { start_date: _staticStart, ...staticRest } = DEFAULT_SCHEDULE_FORM_VALUES;
    expect(rest).toEqual(staticRest);
  });
});
