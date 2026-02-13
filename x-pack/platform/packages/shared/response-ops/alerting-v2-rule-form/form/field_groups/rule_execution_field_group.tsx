/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiIconTip } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { HttpStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FormValues } from '../types';
import { FieldGroup } from './field_group';
import { RuleSchedule } from '../fields/rule_schedule';
import { TimeFieldSelect } from '../fields/time_field_select';
import { LookbackWindow } from '../fields/lookback_window';
import { GroupBySelect } from '../fields/group_by_select';
import { useQueryColumns } from '../hooks/use_query_columns';

interface RuleExecutionFieldGroupProps {
  services: {
    http: HttpStart;
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
  };
  query: string;
}

const SCHEDULE_ROW_ID = 'ruleV2FormScheduleField';
const LOOKBACK_WINDOW_ROW_ID = 'ruleV2FormLookbackWindowField';

export const RuleExecutionFieldGroup: React.FC<RuleExecutionFieldGroupProps> = ({
  query,
  services,
}) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<FormValues>();

  // Columns come from the ES|QL query result (used for grouping)
  const { data: columns } = useQueryColumns({ query, search: services.data.search.search });

  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.ruleExecution', {
        defaultMessage: 'Rule execution',
      })}
    >
      <EuiFormRow
        id={SCHEDULE_ROW_ID}
        label={i18n.translate('xpack.alertingV2.ruleForm.scheduleLabel', {
          defaultMessage: 'Schedule',
        })}
        helpText={
          <>
            {i18n.translate('xpack.alertingV2.ruleForm.scheduleHelpText', {
              defaultMessage: 'Set the frequency to check the alert conditions',
            })}
            &nbsp;
            <EuiIconTip
              position="right"
              type="question"
              content={i18n.translate('xpack.alertingV2.ruleForm.scheduleTooltip', {
                defaultMessage:
                  'The frequency of how often the rule runs. This check can be delayed based on the Kibana polling frequency.',
              })}
            />
          </>
        }
        isInvalid={!!errors.schedule?.custom}
        error={errors.schedule?.custom?.message}
      >
        <Controller
          control={control}
          name="schedule.custom"
          render={({ field }) => <RuleSchedule {...field} />}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.alertingV2.ruleForm.timeFieldLabel', {
          defaultMessage: 'Time Field',
        })}
      >
        <Controller
          name="timeField"
          control={control}
          render={({ field }) => <TimeFieldSelect {...field} services={services} />}
        />
      </EuiFormRow>

      <EuiFormRow
        id={LOOKBACK_WINDOW_ROW_ID}
        label={i18n.translate('xpack.alertingV2.ruleForm.lookbackWindowLabel', {
          defaultMessage: 'Lookback Window',
        })}
        isInvalid={!!errors.lookbackWindow}
        error={errors.lookbackWindow?.message}
      >
        <Controller
          control={control}
          name="lookbackWindow"
          render={({ field }) => <LookbackWindow {...field} />}
        />
      </EuiFormRow>

      <GroupBySelect columns={columns} />
    </FieldGroup>
  );
};
