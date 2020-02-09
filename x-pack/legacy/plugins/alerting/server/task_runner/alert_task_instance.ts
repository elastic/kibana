/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { ConcreteTaskInstance } from '../../../../../plugins/task_manager/server';
import { SanitizedAlert } from '../types';
import { DateFromString } from '../lib/types';
import { AlertInstance, rawAlertInstance } from '../alert_instance';

export interface AlertTaskInstance extends ConcreteTaskInstance {
  state: AlertTaskState;
}

export const alertStateSchema = t.partial({
  alertTypeState: t.record(t.string, t.unknown),
  alertInstances: t.record(t.string, rawAlertInstance),
  previousStartedAt: t.union([t.null, DateFromString]),
});
export type AlertInstances = Record<string, AlertInstance>;
export type AlertTaskState = t.TypeOf<typeof alertStateSchema>;

const alertParamsSchema = t.intersection([
  t.type({
    alertId: t.string,
  }),
  t.partial({
    spaceId: t.string,
  }),
]);
export type AlertTaskParams = t.TypeOf<typeof alertParamsSchema>;

const enumerateErrorFields = (e: t.Errors) =>
  `${e.map(({ context }) => context.map(({ key }) => key).join('.'))}`;

export function taskInstanceToAlertTaskInstance(
  taskInstance: ConcreteTaskInstance,
  alert?: SanitizedAlert
): AlertTaskInstance {
  return {
    ...taskInstance,
    params: pipe(
      alertParamsSchema.decode(taskInstance.params),
      fold((e: t.Errors) => {
        throw new Error(
          `Task "${taskInstance.id}" ${
            alert ? `(underlying Alert "${alert.id}") ` : ''
          }has an invalid param at ${enumerateErrorFields(e)}`
        );
      }, t.identity)
    ),
    state: pipe(
      alertStateSchema.decode(taskInstance.state),
      fold((e: t.Errors) => {
        throw new Error(
          `Task "${taskInstance.id}" ${
            alert ? `(underlying Alert "${alert.id}") ` : ''
          }has invalid state at ${enumerateErrorFields(e)}`
        );
      }, t.identity)
    ),
  };
}
