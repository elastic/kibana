/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FieldGroup } from './field_group';
import { ScheduleField } from '../fields/schedule_field';
import { TimeFieldSelect } from '../fields/time_field_select';
import { LookbackWindowField } from '../fields/lookback_window_field';
import { GroupFieldSelect } from '../fields/group_field_select';
import { NoDataHandlingField } from '../fields/no_data_handling_field';

export const RuleExecutionFieldGroup: React.FC = () => {
  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.ruleExecution', {
        defaultMessage: 'Rule execution',
      })}
    >
      <ScheduleField />
      <TimeFieldSelect />
      <LookbackWindowField />
      <GroupFieldSelect />
      <NoDataHandlingField />
    </FieldGroup>
  );
};
