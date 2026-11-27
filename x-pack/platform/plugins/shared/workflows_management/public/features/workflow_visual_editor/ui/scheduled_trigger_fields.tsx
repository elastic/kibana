/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonGroup,
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { timezoneNames } from '@kbn/workflows';
import {
  DEFAULT_SCHEDULE_DRAFT,
  parseSchedule,
  type Repeat,
  type ScheduleDraft,
  type ScheduleMode,
  scheduleToWith,
  validateSchedule,
  type Weekday,
  WEEKDAYS,
} from '../lib/scheduled_trigger_model';
import { describeSchedule, getWeekdayName } from '../lib/scheduled_trigger_summary';

const MONTH_DAYS = Array.from({ length: 31 }, (_, index) => index + 1);
const NARROW_FIELD_WIDTH = 220;

const REPEAT_UNIT: Readonly<Record<Repeat, string>> = {
  daily: i18n.translate('workflows.scheduledTrigger.unit.days', { defaultMessage: 'day(s)' }),
  weekly: i18n.translate('workflows.scheduledTrigger.unit.weeks', { defaultMessage: 'week(s)' }),
  monthly: i18n.translate('workflows.scheduledTrigger.unit.months', {
    defaultMessage: 'month(s)',
  }),
};

const toggle = <T,>(list: readonly T[], item: T): T[] =>
  list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];

export interface ScheduledTriggerFieldsProps {
  /** The `with` of the trigger, as read from its YAML. */
  readonly value: unknown;
  readonly readOnly?: boolean;
  /** Every `with` the form can write, as it is edited. */
  readonly onChange: (value: Record<string, unknown>) => void;
}

/**
 * The schedule of a scheduled trigger: a fixed interval, or a date and time pattern (daily, weekly or
 * monthly at a time of day in a time zone). A schedule the form cannot write back unchanged is shown
 * as such and left to the YAML tab.
 */
export function ScheduledTriggerFields({
  value,
  readOnly = false,
  onChange,
}: ScheduledTriggerFieldsProps) {
  const { euiTheme } = useEuiTheme();
  const parsed = useMemo(() => parseSchedule(value), [value]);
  const [draft, setDraft] = useState<ScheduleDraft>(parsed ?? DEFAULT_SCHEDULE_DRAFT);
  // What this form wrote last: a `with` that differs from it came from somewhere else (the YAML tab).
  const lastWritten = useRef<string | undefined>(undefined);
  const appliedKey = useRef(JSON.stringify(value ?? null));
  const valueKey = JSON.stringify(value ?? null);

  useEffect(() => {
    if (valueKey === appliedKey.current) return;
    appliedKey.current = valueKey;
    if (valueKey === lastWritten.current) return;
    lastWritten.current = undefined;
    if (parsed) setDraft(parsed);
  }, [valueKey, parsed]);

  const update = useCallback(
    (changes: Partial<ScheduleDraft>) => {
      const next = { ...draft, ...changes };
      setDraft(next);
      if (Object.keys(validateSchedule(next)).length > 0) return;
      const written = scheduleToWith(next);
      lastWritten.current = JSON.stringify(written);
      onChange(written);
    },
    [draft, onChange]
  );

  const errors = validateSchedule(draft);
  const summary = describeSchedule(draft);
  const timezoneOptions = useMemo(
    () => timezoneNames.map((name) => ({ value: name, text: name.replace(/_/g, ' ') })),
    []
  );

  if (!parsed) {
    return (
      <KbnInfoCallout
        size="s"
        announceOnMount={false}
        title={i18n.translate('workflows.scheduledTrigger.unsupportedTitle', {
          defaultMessage: 'This schedule is edited in YAML',
        })}
        text={i18n.translate('workflows.scheduledTrigger.unsupportedBody', {
          defaultMessage:
            'It uses options the form cannot edit without changing them, such as a start date or several times of day. Use the YAML tab to change it.',
        })}
        data-test-subj="workflowTriggerConfigScheduleUnsupported"
      />
    );
  }

  const modeOptions: Array<{ id: ScheduleMode; label: string }> = [
    {
      id: 'interval',
      label: i18n.translate('workflows.scheduledTrigger.mode.interval', {
        defaultMessage: 'Interval',
      }),
    },
    {
      id: 'calendar',
      label: i18n.translate('workflows.scheduledTrigger.mode.calendar', {
        defaultMessage: 'Date & time',
      }),
    },
  ];
  const repeatOptions: Array<{ id: Repeat; label: string }> = [
    {
      id: 'daily',
      label: i18n.translate('workflows.scheduledTrigger.repeat.daily', { defaultMessage: 'Daily' }),
    },
    {
      id: 'weekly',
      label: i18n.translate('workflows.scheduledTrigger.repeat.weekly', {
        defaultMessage: 'Weekly',
      }),
    },
    {
      id: 'monthly',
      label: i18n.translate('workflows.scheduledTrigger.repeat.monthly', {
        defaultMessage: 'Monthly',
      }),
    },
  ];

  const days = draft.repeat === 'daily' ? draft.dailyDays : draft.weeklyDays;
  const setDays = (next: Weekday[]) =>
    update(draft.repeat === 'daily' ? { dailyDays: next } : { weeklyDays: next });

  return (
    <div
      css={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.m }}
      data-test-subj="workflowTriggerConfigSchedule"
    >
      <EuiFormRow
        label={i18n.translate('workflows.scheduledTrigger.scheduleLabel', {
          defaultMessage: 'Schedule',
        })}
        fullWidth
      >
        <EuiButtonGroup
          legend={i18n.translate('workflows.scheduledTrigger.scheduleLabel', {
            defaultMessage: 'Schedule',
          })}
          buttonSize="compressed"
          isFullWidth
          isDisabled={readOnly}
          options={modeOptions.map((option) => ({
            ...option,
            'data-test-subj': `workflowTriggerConfigScheduleMode-${option.id}`,
          }))}
          idSelected={draft.mode}
          onChange={(id) => update({ mode: id as ScheduleMode })}
          data-test-subj="workflowTriggerConfigScheduleMode"
        />
      </EuiFormRow>

      {/* Sticky, so the result stays in view while the fields below it are edited on a short screen. */}
      <div
        aria-live="polite"
        css={{
          position: 'sticky',
          top: 0,
          zIndex: Number(euiTheme.levels.content) + 1,
          padding: euiTheme.size.s,
          borderRadius: euiTheme.border.radius.medium,
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
          boxShadow: `0 ${euiTheme.size.s} 0 ${euiTheme.colors.backgroundBasePlain}`,
        }}
        data-test-subj="workflowTriggerConfigScheduleSummary"
      >
        <EuiText size="s" color={summary ? 'default' : 'subdued'}>
          <p>
            {summary ||
              i18n.translate('workflows.scheduledTrigger.summary.incomplete', {
                defaultMessage: 'Complete the fields below to see the schedule.',
              })}
          </p>
        </EuiText>
      </div>

      {draft.mode === 'interval' ? (
        <EuiFormRow
          label={i18n.translate('workflows.triggerConfigPanel.everyLabel', {
            defaultMessage: 'Run every',
          })}
          helpText={i18n.translate('workflows.triggerConfigPanel.everyHelp', {
            defaultMessage:
              'Minimum 1 minute. Examples: 90s, 15m, 2h, 1d. Here m is minutes: for weekly or monthly runs, use Date & time.',
          })}
          isInvalid={errors.interval === true}
          error={i18n.translate('workflows.scheduledTrigger.intervalError', {
            defaultMessage:
              'Enter a number and a unit, for at least 1 minute: for example 90s, 15m, 2h or 1d.',
          })}
          fullWidth
        >
          <EuiFieldText
            compressed
            fullWidth
            value={draft.intervalText}
            isInvalid={errors.interval === true}
            disabled={readOnly}
            onChange={(e) => update({ intervalText: e.target.value })}
            data-test-subj="workflowTriggerConfigPanelEvery"
          />
        </EuiFormRow>
      ) : (
        <>
          <EuiFormRow
            label={i18n.translate('workflows.scheduledTrigger.repeatLabel', {
              defaultMessage: 'Repeat',
            })}
            fullWidth
          >
            <EuiButtonGroup
              legend={i18n.translate('workflows.scheduledTrigger.repeatLabel', {
                defaultMessage: 'Repeat',
              })}
              buttonSize="compressed"
              isFullWidth
              isDisabled={readOnly}
              options={repeatOptions.map((option) => ({
                ...option,
                'data-test-subj': `workflowTriggerConfigScheduleRepeat-${option.id}`,
              }))}
              idSelected={draft.repeat}
              onChange={(id) => update({ repeat: id as Repeat })}
              data-test-subj="workflowTriggerConfigScheduleRepeat"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('workflows.scheduledTrigger.everyLabel', {
              defaultMessage: 'Every',
            })}
            isInvalid={errors.count === true}
            error={i18n.translate('workflows.scheduledTrigger.countError', {
              defaultMessage: 'Enter a whole number of 1 or more.',
            })}
          >
            <EuiFieldNumber
              compressed
              min={1}
              step={1}
              value={draft.count}
              isInvalid={errors.count === true}
              disabled={readOnly}
              append={REPEAT_UNIT[draft.repeat]}
              onChange={(e) => update({ count: e.target.value })}
              css={{ maxInlineSize: NARROW_FIELD_WIDTH }}
              data-test-subj="workflowTriggerConfigScheduleCount"
            />
          </EuiFormRow>

          {draft.repeat === 'monthly' ? (
            <EuiFormRow
              label={i18n.translate('workflows.scheduledTrigger.onDayLabel', {
                defaultMessage: 'On day',
              })}
              helpText={i18n.translate('workflows.scheduledTrigger.onDayHelp', {
                defaultMessage: 'Select one or more days of the month.',
              })}
              isInvalid={errors.monthDays === true}
              error={i18n.translate('workflows.scheduledTrigger.daysError', {
                defaultMessage: 'Select at least one day.',
              })}
              fullWidth
            >
              <div
                role="group"
                css={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: euiTheme.size.xs,
                }}
                data-test-subj="workflowTriggerConfigScheduleMonthDays"
              >
                {MONTH_DAYS.map((day) => {
                  const selected = draft.monthDays.includes(day);
                  return (
                    <EuiButton
                      key={day}
                      size="s"
                      minWidth={0}
                      fill={selected}
                      color={selected ? 'primary' : 'text'}
                      isDisabled={readOnly}
                      isSelected={selected}
                      onClick={() => update({ monthDays: toggle(draft.monthDays, day) })}
                      data-test-subj={`workflowTriggerConfigScheduleMonthDay-${day}`}
                    >
                      {day}
                    </EuiButton>
                  );
                })}
              </div>
            </EuiFormRow>
          ) : (
            <EuiFormRow
              label={i18n.translate('workflows.scheduledTrigger.onLabel', {
                defaultMessage: 'On',
              })}
              helpText={
                draft.repeat === 'daily'
                  ? i18n.translate('workflows.scheduledTrigger.onDailyHelp', {
                      defaultMessage: 'Run only on the selected days.',
                    })
                  : i18n.translate('workflows.scheduledTrigger.onWeeklyHelp', {
                      defaultMessage: 'Select one or more days of the week.',
                    })
              }
              isInvalid={errors.days === true}
              error={i18n.translate('workflows.scheduledTrigger.daysError', {
                defaultMessage: 'Select at least one day.',
              })}
              fullWidth
            >
              <div
                role="group"
                aria-label={i18n.translate('workflows.scheduledTrigger.onLabel', {
                  defaultMessage: 'On',
                })}
                css={{ display: 'flex', flexWrap: 'wrap', gap: euiTheme.size.xs }}
                data-test-subj="workflowTriggerConfigScheduleDays"
              >
                {WEEKDAYS.map((day) => {
                  const selected = days.includes(day);
                  return (
                    <EuiButton
                      key={day}
                      size="s"
                      minWidth={44}
                      fill={selected}
                      color={selected ? 'primary' : 'text'}
                      isDisabled={readOnly}
                      isSelected={selected}
                      aria-label={getWeekdayName(day)}
                      onClick={() => setDays(toggle(days, day))}
                      data-test-subj={`workflowTriggerConfigScheduleDay-${day}`}
                    >
                      {getWeekdayName(day).slice(0, 3)}
                    </EuiButton>
                  );
                })}
              </div>
            </EuiFormRow>
          )}

          <EuiFormRow
            label={i18n.translate('workflows.scheduledTrigger.atLabel', { defaultMessage: 'At' })}
            isInvalid={errors.time === true}
            error={i18n.translate('workflows.scheduledTrigger.timeError', {
              defaultMessage: 'Enter a time.',
            })}
          >
            <EuiFieldText
              compressed
              type="time"
              value={draft.time}
              isInvalid={errors.time === true}
              disabled={readOnly}
              onChange={(e) => update({ time: e.target.value })}
              css={{ maxInlineSize: NARROW_FIELD_WIDTH }}
              data-test-subj="workflowTriggerConfigScheduleTime"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('workflows.scheduledTrigger.timezoneLabel', {
              defaultMessage: 'Time zone',
            })}
            fullWidth
          >
            <EuiSelect
              compressed
              fullWidth
              options={timezoneOptions}
              value={draft.tzid}
              disabled={readOnly}
              onChange={(e) => update({ tzid: e.target.value })}
              data-test-subj="workflowTriggerConfigScheduleTimezone"
            />
          </EuiFormRow>
        </>
      )}
    </div>
  );
}
