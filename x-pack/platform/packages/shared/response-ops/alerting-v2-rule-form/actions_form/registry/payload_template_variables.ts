/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionVariable } from '@kbn/alerting-types';
import { i18n } from '@kbn/i18n';
import {
  ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID,
  builtinWorkflowInputDefinitions,
  type JsonSchema,
} from '@kbn/workflows';

const PAYLOAD_PATH = 'inputs.payload';
// Matches the loop variable used by the default inline action templates.
const ALERT_LOOP_VARIABLE = 'alert';
const ALERTS_LOOP = `{% for ${ALERT_LOOP_VARIABLE} in ${PAYLOAD_PATH}.alerts %}`;

const withinAlertsLoop = (description: string): string =>
  i18n.translate('xpack.alertingV2.alertingV2RuleForm.actionForm.params.alertsLoopVariable', {
    defaultMessage: '{description}. Use inside {loop}.',
    values: { description, loop: ALERTS_LOOP },
  });

const toVariables = (
  properties: Record<string, JsonSchema> | undefined,
  buildName: (key: string) => string,
  buildDescription: (description: string) => string = (description) => description
): ActionVariable[] =>
  Object.entries(properties ?? {}).map(([key, { description = '' }]) => ({
    name: buildName(key),
    description: buildDescription(description),
  }));

const getArrayItemSchema = (schema: JsonSchema | undefined): JsonSchema | undefined =>
  Array.isArray(schema?.items) ? schema?.items[0] : schema?.items;

const getMapValueSchema = (schema: JsonSchema | undefined): JsonSchema | undefined => {
  const additionalProperties = schema?.additionalProperties;
  return typeof additionalProperties === 'object' ? additionalProperties : undefined;
};

/**
 * Returns the Liquid template variables available to inline action policy workflows,
 * derived from the `alertingV2NotificationGroup` dispatch payload schema.
 */
export const getPayloadTemplateVariables = (): ActionVariable[] => {
  const schema =
    builtinWorkflowInputDefinitions[ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID];
  if (!schema) {
    return [];
  }

  const { properties } = schema;

  const payloadVariables = toVariables(properties, (key) => `${PAYLOAD_PATH}.${key}`);

  const alertVariables = toVariables(
    getArrayItemSchema(properties?.alerts)?.properties,
    (key) => `${ALERT_LOOP_VARIABLE}.${key}`,
    withinAlertsLoop
  );

  const ruleVariables = toVariables(
    getMapValueSchema(properties?.rules)?.properties,
    (key) => `${PAYLOAD_PATH}.rules[${ALERT_LOOP_VARIABLE}.rule_id].${key}`,
    withinAlertsLoop
  );

  return [...payloadVariables, ...alertVariables, ...ruleVariables];
};
