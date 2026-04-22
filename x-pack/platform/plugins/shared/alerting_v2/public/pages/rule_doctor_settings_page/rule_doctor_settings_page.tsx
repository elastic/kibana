/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import { Frequency } from '@kbn/rrule';
import {
  Form,
  useForm,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getRecurringScheduleFormSchema } from '@kbn/response-ops-recurring-schedule-form/schemas/recurring_schedule_form_schema';
import { RecurringScheduleFormFields } from '@kbn/response-ops-recurring-schedule-form/components/recurring_schedule_form_fields';
import { convertToRRule } from '@kbn/response-ops-recurring-schedule-form/utils/convert_to_rrule';
import { getInitialByWeekday } from '@kbn/response-ops-recurring-schedule-form/utils/get_initial_by_weekday';
import { RecurrenceEnd } from '@kbn/response-ops-recurring-schedule-form/constants';
import type {
  RecurringSchedule,
  RecurrenceFrequency,
} from '@kbn/response-ops-recurring-schedule-form/types';
import { DurationInput } from '@kbn/alerting-v2-rule-form/form/fields/duration_input';
import {
  EuiButton,
  EuiButtonGroup,
  EuiCallOut,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';

interface RuleDoctorRRuleConfig {
  freq: string;
  interval: number;
  tzid: string;
  dtstart?: string;
  byhour?: number[];
  byminute?: number[];
  byweekday?: string[];
  bymonthday?: number[];
  bymonth?: number[];
}

interface RuleDoctorSettings {
  scheduleEnabled: boolean;
  scheduleType: 'interval' | 'rrule';
  interval?: string;
  rrule?: RuleDoctorRRuleConfig;
}

const FREQ_STRING_TO_ENUM: Record<string, Frequency> = {
  YEARLY: Frequency.YEARLY,
  MONTHLY: Frequency.MONTHLY,
  WEEKLY: Frequency.WEEKLY,
  DAILY: Frequency.DAILY,
  HOURLY: Frequency.HOURLY,
};

const FREQ_ENUM_TO_STRING: Record<number, string> = {
  [Frequency.YEARLY]: 'YEARLY',
  [Frequency.MONTHLY]: 'MONTHLY',
  [Frequency.WEEKLY]: 'WEEKLY',
  [Frequency.DAILY]: 'DAILY',
  [Frequency.HOURLY]: 'HOURLY',
};

const SCHEDULE_TYPE_BUTTONS = [
  {
    id: 'interval',
    label: i18n.translate('xpack.alertingV2.ruleDoctorSettings.intervalLabel', {
      defaultMessage: 'Interval',
    }),
  },
  {
    id: 'rrule',
    label: i18n.translate('xpack.alertingV2.ruleDoctorSettings.rruleLabel', {
      defaultMessage: 'Recurring schedule',
    }),
  },
];

const DEFAULT_SETTINGS: RuleDoctorSettings = {
  scheduleEnabled: false,
  scheduleType: 'interval',
  interval: '1d',
};

const DEFAULT_RECURRING_SCHEDULE: RecurringSchedule = {
  frequency: Frequency.DAILY,
  interval: 1,
  ends: RecurrenceEnd.NEVER,
};

function convertServerRRuleToFormSchedule(
  rrule: RuleDoctorRRuleConfig
): RecurringSchedule {
  const freq = FREQ_STRING_TO_ENUM[rrule.freq] ?? Frequency.DAILY;
  const isCustom =
    rrule.interval > 1 ||
    (freq === Frequency.WEEKLY &&
      rrule.byweekday != null &&
      rrule.byweekday.length > 1) ||
    (freq === Frequency.MONTHLY && rrule.bymonthday != null);

  const schedule: RecurringSchedule = {
    frequency: isCustom ? 'CUSTOM' : freq,
    interval: rrule.interval,
    ends: RecurrenceEnd.NEVER,
  };

  if (isCustom) {
    schedule.customFrequency = freq as RecurrenceFrequency;
  }

  if (rrule.byweekday && freq !== Frequency.MONTHLY) {
    schedule.byweekday = getInitialByWeekday(rrule.byweekday, null);
  }

  if (freq === Frequency.MONTHLY) {
    if (rrule.byweekday) {
      schedule.bymonth = 'weekday';
    } else if (rrule.bymonthday) {
      schedule.bymonth = 'day';
    }
  }

  return schedule;
}

function convertFormScheduleToServerRRule(
  recurringSchedule: RecurringSchedule,
  timezone: string,
  startDate: string
): RuleDoctorRRuleConfig {
  const rRuleParams = convertToRRule({
    startDate,
    timezone,
    recurringSchedule,
  });

  const config: RuleDoctorRRuleConfig = {
    freq: FREQ_ENUM_TO_STRING[rRuleParams.freq!] ?? 'DAILY',
    interval: rRuleParams.interval ?? 1,
    tzid: rRuleParams.tzid,
    dtstart: rRuleParams.dtstart,
  };

  if (rRuleParams.byweekday) {
    config.byweekday = rRuleParams.byweekday as string[];
  }
  if (rRuleParams.bymonthday) {
    config.bymonthday = rRuleParams.bymonthday as number[];
  }
  if (rRuleParams.byhour) {
    config.byhour = rRuleParams.byhour as number[];
  }
  if (rRuleParams.byminute) {
    config.byminute = rRuleParams.byminute as number[];
  }
  if (rRuleParams.bymonth) {
    config.bymonth = rRuleParams.bymonth as number[];
  }

  return config;
}

interface RRuleFormData {
  recurringSchedule: RecurringSchedule;
}

const rruleFormSchema = {
  recurringSchedule: getRecurringScheduleFormSchema({
    allowInfiniteRecurrence: true,
  }),
};

export const RuleDoctorSettingsPage = () => {
  const http = useService(CoreStart('http'));
  const [settings, setSettings] = useState<RuleDoctorSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    http
      .get<RuleDoctorSettings>('/internal/alerting/v2/rule_doctor/settings')
      .then((res) => {
        if (!cancelled) {
          setSettings({ ...DEFAULT_SETTINGS, ...res });
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSettings(DEFAULT_SETTINGS);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [http]);

  if (loading || !settings) {
    return <EuiLoadingSpinner size="xl" />;
  }

  return <RuleDoctorSettingsPageContent initialSettings={settings} />;
};

const RuleDoctorSettingsPageContent = ({
  initialSettings,
}: {
  initialSettings: RuleDoctorSettings;
}) => {
  const http = useService(CoreStart('http'));
  const history = useHistory();

  const [scheduleEnabled, setScheduleEnabled] = useState(
    initialSettings.scheduleEnabled
  );
  const [scheduleType, setScheduleType] = useState(
    initialSettings.scheduleType
  );
  const [interval, setInterval] = useState(initialSettings.interval ?? '1d');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState('');

  const [startDate] = useState(() => moment().toISOString());
  const timezone =
    initialSettings.rrule?.tzid ??
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    'UTC';

  const initialRecurringSchedule = initialSettings.rrule
    ? convertServerRRuleToFormSchedule(initialSettings.rrule)
    : DEFAULT_RECURRING_SCHEDULE;

  const { form: rruleForm } = useForm<RRuleFormData>({
    defaultValue: { recurringSchedule: initialRecurringSchedule },
    schema: rruleFormSchema,
    options: { stripEmptyFields: true },
  });

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const payload: RuleDoctorSettings = {
        scheduleEnabled,
        scheduleType,
      };

      if (scheduleType === 'interval') {
        payload.interval = interval;
      } else {
        const formData = rruleForm.getFormData();
        payload.rrule = convertFormScheduleToServerRRule(
          formData.recurringSchedule,
          timezone,
          startDate
        );
      }

      await http.put('/internal/alerting/v2/rule_doctor/settings', {
        body: JSON.stringify(payload),
      });
      setSaveResult('success');
    } catch (e) {
      setSaveResult('error');
      setErrorMessage(
        e instanceof Error ? e.message : 'Failed to save settings'
      );
    } finally {
      setSaving(false);
    }
  }, [
    http,
    scheduleEnabled,
    scheduleType,
    interval,
    rruleForm,
    timezone,
    startDate,
  ]);

  return (
    <>
      <EuiPageHeader
        pageTitle={i18n.translate(
          'xpack.alertingV2.ruleDoctorSettings.pageTitle',
          { defaultMessage: 'Rule Doctor Settings' }
        )}
        description={i18n.translate(
          'xpack.alertingV2.ruleDoctorSettings.pageDescription',
          {
            defaultMessage:
              'Configure how often Rule Doctor automatically analyzes your rules.',
          }
        )}
        rightSideItems={[
          <EuiButton
            key="back"
            size="s"
            color="text"
            iconType="arrowLeft"
            onClick={() => history.push('/doctor')}
          >
            {i18n.translate('xpack.alertingV2.ruleDoctorSettings.backButton', {
              defaultMessage: 'Back to Rule Doctor',
            })}
          </EuiButton>,
        ]}
      />
      <EuiSpacer size="l" />

      {saveResult === 'success' && (
        <>
          <EuiCallOut
            title={i18n.translate(
              'xpack.alertingV2.ruleDoctorSettings.saveSuccess',
              { defaultMessage: 'Settings saved' }
            )}
            color="success"
            iconType="check"
          />
          <EuiSpacer size="m" />
        </>
      )}

      {saveResult === 'error' && (
        <>
          <EuiCallOut
            title={i18n.translate(
              'xpack.alertingV2.ruleDoctorSettings.saveError',
              { defaultMessage: 'Failed to save settings' }
            )}
            color="danger"
            iconType="error"
          >
            <p>{errorMessage}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiPanel hasBorder>
        <EuiTitle size="s">
          <h3>
            {i18n.translate(
              'xpack.alertingV2.ruleDoctorSettings.scheduleSectionTitle',
              { defaultMessage: 'Scheduled Analysis' }
            )}
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate(
            'xpack.alertingV2.ruleDoctorSettings.enableLabel',
            { defaultMessage: 'Enable scheduled analysis' }
          )}
        >
          <EuiSwitch
            label={i18n.translate(
              'xpack.alertingV2.ruleDoctorSettings.enableDescription',
              {
                defaultMessage:
                  'Automatically run Rule Doctor on a schedule',
              }
            )}
            checked={scheduleEnabled}
            onChange={(e) => setScheduleEnabled(e.target.checked)}
          />
        </EuiFormRow>

        {scheduleEnabled && (
          <>
            <EuiSpacer size="m" />
            <EuiFormRow
              label={i18n.translate(
                'xpack.alertingV2.ruleDoctorSettings.scheduleTypeLabel',
                { defaultMessage: 'Schedule type' }
              )}
            >
              <EuiButtonGroup
                legend="Schedule type"
                options={SCHEDULE_TYPE_BUTTONS}
                idSelected={scheduleType}
                onChange={(id) =>
                  setScheduleType(id as 'interval' | 'rrule')
                }
              />
            </EuiFormRow>

            <EuiSpacer size="m" />

            {scheduleType === 'interval' && (
              <EuiFormRow
                label={i18n.translate(
                  'xpack.alertingV2.ruleDoctorSettings.intervalLabel2',
                  { defaultMessage: 'Run every' }
                )}
                helpText={i18n.translate(
                  'xpack.alertingV2.ruleDoctorSettings.intervalHelp',
                  { defaultMessage: 'Minimum interval is 1 day.' }
                )}
              >
                <DurationInput
                  value={interval}
                  onChange={setInterval}
                  numberLabel={i18n.translate(
                    'xpack.alertingV2.ruleDoctorSettings.intervalNumberLabel',
                    { defaultMessage: 'Every' }
                  )}
                  unitAriaLabel={i18n.translate(
                    'xpack.alertingV2.ruleDoctorSettings.intervalUnitAriaLabel',
                    { defaultMessage: 'Time unit' }
                  )}
                  dataTestSubj="ruleDoctorScheduleInterval"
                  idPrefix="ruleDoctorScheduleInterval"
                />
              </EuiFormRow>
            )}

            {scheduleType === 'rrule' && (
              <Form form={rruleForm}>
                <RecurringScheduleFormFields
                  startDate={startDate}
                  timezone={[timezone]}
                  supportsEndOptions={false}
                  allowInfiniteRecurrence={true}
                />
              </Form>
            )}
          </>
        )}

        <EuiSpacer size="l" />
        <EuiButton fill isLoading={saving} onClick={handleSave}>
          {i18n.translate('xpack.alertingV2.ruleDoctorSettings.saveButton', {
            defaultMessage: 'Save settings',
          })}
        </EuiButton>
      </EuiPanel>
    </>
  );
};
