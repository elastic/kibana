/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AlertInstanceContext } from '@kbn/alerting-plugin/server';
import { Params } from './rule_type_params';

// rule type context provided to actions
export interface ActionContext extends BaseActionContext {
  // a short pre-constructed message which may be used in an action field
  title: string;
  // a longer pre-constructed message which may be used in an action field
  message: string;
}

export interface BaseActionContext extends AlertInstanceContext {
  // the aggType used in the rule
  // the value of the aggField, if used, otherwise 'all documents'
  group: string;
  // the date the rule was run as an ISO date
  date: string;
  // the value that met the threshold
  value: number | string;
  // threshold conditions
  conditions: string;
}

const DEFAULT_TITLE = (name: string, group: string) =>
  i18n.translate('xpack.stackAlerts.indexThreshold.alertTypeContextSubjectTitle', {
    defaultMessage: 'alert {name} group {group} met threshold',
    values: { name, group },
  });

const RECOVERY_TITLE = (name: string, group: string) =>
  i18n.translate('xpack.stackAlerts.indexThreshold.alertTypeRecoveryContextSubjectTitle', {
    defaultMessage: 'alert {name} group {group} recovered',
    values: { name, group },
  });

const DEFAULT_MESSAGE = (name: string, context: BaseActionContext, window: string) =>
  i18n.translate('xpack.stackAlerts.indexThreshold.alertTypeContextMessageDescription', {
    defaultMessage: `alert ''{name}'' is active for group ''{group}'':

- Value: {value}
- Conditions Met: {conditions} over {window}
- Timestamp: {date}`,
    values: {
      name,
      group: context.group,
      value: context.value,
      conditions: context.conditions,
      window,
      date: context.date,
    },
  });

const RECOVERY_MESSAGE = (name: string, context: BaseActionContext, window: string) =>
  i18n.translate('xpack.stackAlerts.indexThreshold.alertTypeRecoveryContextMessageDescription', {
    defaultMessage: `alert ''{name}'' is recovered for group ''{group}'':

- Value: {value}
- Conditions Met: {conditions} over {window}
- Timestamp: {date}`,
    values: {
      name,
      group: context.group,
      value: context.value,
      conditions: context.conditions,
      window,
      date: context.date,
    },
  });

export function addMessages(
  ruleName: string,
  baseContext: BaseActionContext,
  params: Params,
  isRecoveryMessage?: boolean
): ActionContext {
  const title = isRecoveryMessage
    ? RECOVERY_TITLE(ruleName, baseContext.group)
    : DEFAULT_TITLE(ruleName, baseContext.group);

  const window = `${params.timeWindowSize}${params.timeWindowUnit}`;

  const message = isRecoveryMessage
    ? RECOVERY_MESSAGE(ruleName, baseContext, window)
    : DEFAULT_MESSAGE(ruleName, baseContext, window);

  return { ...baseContext, title, message };
}
