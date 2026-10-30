/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionVariable } from '@kbn/alerting-types';
import { i18n } from '@kbn/i18n';
import { getContextVariables } from './payload_variables';

const INPUTS = 'inputs';
const PAYLOAD_PATH = `${INPUTS}.payload`;
// Matches the loop variable used by the default inline action templates.
const ALERT_LOOP_VARIABLE = 'alert';
const ALERTS_LOOP = `{% for ${ALERT_LOOP_VARIABLE} in ${PAYLOAD_PATH}.alerts %}`;
const ALERT_RULE_ID = `${ALERT_LOOP_VARIABLE}.rule_id`;

// Any array index resolves to the alert item schema, and any map key to the rule value schema.
const ALERT_ITEM_PATH = [INPUTS, 'payload', 'alerts', '0'];
const RULE_VALUE_PATH = [INPUTS, 'payload', 'rules', ALERT_RULE_ID];

const withinAlertsLoop = (description: string): string =>
  i18n.translate('xpack.alertingV2.alertingV2RuleForm.actionForm.params.alertsLoopVariable', {
    defaultMessage: '{description}. Use inside {loop}.',
    values: { description, loop: ALERTS_LOOP },
  });

const toActionVariables = (
  path: readonly string[],
  buildName: (key: string) => string,
  buildDescription: (description: string) => string = (description) => description
): ActionVariable[] =>
  getContextVariables(path).map(({ path: key, documentation = '' }) => ({
    name: buildName(key),
    description: buildDescription(documentation),
  }));

/**
 * Returns the Liquid template variables available to inline action policy workflows,
 * derived from the workflow's trigger inputs schema.
 */
export const getPayloadTemplateVariables = (): ActionVariable[] => {
  const inputVariables = getContextVariables([INPUTS]).flatMap(({ path: input }) =>
    toActionVariables([INPUTS, input], (key) => `${INPUTS}.${input}.${key}`)
  );

  const alertVariables = toActionVariables(
    ALERT_ITEM_PATH,
    (key) => `${ALERT_LOOP_VARIABLE}.${key}`,
    withinAlertsLoop
  );

  const ruleVariables = toActionVariables(
    RULE_VALUE_PATH,
    (key) => `${PAYLOAD_PATH}.rules[${ALERT_RULE_ID}].${key}`,
    withinAlertsLoop
  );

  return [...inputVariables, ...alertVariables, ...ruleVariables];
};
