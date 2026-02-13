/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { FieldGroup } from './field_group';
import { ScheduleField } from '../fields/schedule_field';
import { TimeFieldSelect } from '../fields/time_field_select';
import { LookbackWindowField } from '../fields/lookback_window_field';
import { GroupFieldSelect } from '../fields/group_field_select';

interface RuleExecutionFieldGroupProps {
  services: {
    http: HttpStart;
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
  };
}

export const RuleExecutionFieldGroup: React.FC<RuleExecutionFieldGroupProps> = ({ services }) => {
  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.ruleExecution', {
        defaultMessage: 'Rule execution',
      })}
    >
      <ScheduleField />
      <TimeFieldSelect services={services} />
      <LookbackWindowField />
      <GroupFieldSelect services={services} />
    </FieldGroup>
  );
};
