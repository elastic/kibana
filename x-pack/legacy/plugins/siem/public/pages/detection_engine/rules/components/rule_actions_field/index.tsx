/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import memoizeOne from 'memoize-one';
import deepMerge from 'deepmerge';

import { SelectField } from '../../../../../shared_imports';
import { ActionForm } from '../../../../../../../../../plugins/triggers_actions_ui/public';
import { useKibana } from '../../../../../lib/kibana';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertAction } from '../../../../../../../../../plugins/triggers_actions_ui/public/types';

type ThrottleSelectField = typeof SelectField;

const ACTION_TYPES = [
  { id: '.email', name: 'Email', enabled: true },
  { id: '.index', name: 'Index', enabled: false },
  { id: '.pagerduty', name: 'PagerDuty', enabled: true },
  { id: '.server-log', name: 'Server log', enabled: false },
  { id: '.servicenow', name: 'servicenow', enabled: false },
  { id: '.slack', name: 'Slack', enabled: true },
  { id: '.webhook', name: 'Webhook', enabled: false },
  { id: '.example-action', name: 'Example Action', enabled: false },
];

const DEFAULT_ACTION_GROUP_ID = 'default';
const DEFAULT_ACTION_MESSAGE = 'Rule generated {{state.signalsCount}} singals';

const MESSAGE_STATE_VARIABLES = ['signalsCount'];
const MESSAGE_CONTEXT_VARIABLES = [
  'inputIndexes',
  'outputIndex',
  'name',
  'alertId',
  'ruleId',
  'ruleLink',
];

const getMessageVariables = memoizeOne(() => {
  const stateVariables = MESSAGE_STATE_VARIABLES.map(variableName => `state.${variableName}`);
  const contextVariables = MESSAGE_CONTEXT_VARIABLES.map(variableName => `context.${variableName}`);

  return [...stateVariables, ...contextVariables];
});

export const RuleActionsField: ThrottleSelectField = ({ field }) => {
  const { http, toastNotifications, triggers_actions_ui } = useKibana().services;
  const actionTypeRegistry = triggers_actions_ui.actionTypeRegistry;
  const messageVariables = getMessageVariables();

  const setActionIdByIndex = useCallback(
    (id: string, index: number) => {
      const updatedActions = [...(field.value as Array<Partial<AlertAction>>)];
      updatedActions[index] = deepMerge(updatedActions[index], { id });
      field.setValue(updatedActions);
    },
    [field]
  );

  const setAlertProperty = useCallback(
    (updatedActions: AlertAction[]) => field.setValue(updatedActions),
    [field]
  );

  const setActionParamsProperty = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: string, value: any, index: number) => {
      const updatedActions = [...(field.value as AlertAction[])];
      updatedActions[index].params[key] = value;
      field.setValue(updatedActions);
    },
    [field]
  );

  return (
    <ActionForm
      toastNotifications={toastNotifications}
      actions={field.value as AlertAction[]}
      messageVariables={messageVariables}
      defaultActionGroupId={DEFAULT_ACTION_GROUP_ID}
      setActionIdByIndex={setActionIdByIndex}
      setAlertProperty={setAlertProperty}
      setActionParamsProperty={setActionParamsProperty}
      http={http}
      actionTypeRegistry={actionTypeRegistry}
      actionTypes={ACTION_TYPES}
      defaultActionMessage={DEFAULT_ACTION_MESSAGE}
    />
  );
};
