/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { pipe } from 'fp-ts/pipeable';
import { fold } from 'fp-ts/Either';
import { DEFAULT_SPACE_ID, brandSpaceId, type SpaceId } from '@kbn/core-spaces-common';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { ruleParamsSchema } from '@kbn/alerting-state-types';
import type { SanitizedRule, RuleTaskState, RuleTypeParams } from '../../common';

/**
 * Rule task params after deserialization, with `spaceId` branded as {@link SpaceId}.
 * The brand is applied once, at this trusted task-instance boundary, so it flows to
 * the task runner, action schedulers and downstream consumers without per-call casts.
 *
 * Persisted task params are a loose bag (`alertId`, `consumer`, `adHocRunParamsId`,
 * etc. are read ad hoc across the regular and ad-hoc runners), so the index signature
 * is preserved; only the branded `spaceId` is guaranteed.
 */
export type AlertTaskParams = ConcreteTaskInstance['params'] & { spaceId: SpaceId };

export interface AlertTaskInstance extends ConcreteTaskInstance {
  state: RuleTaskState;
  params: AlertTaskParams;
}

const enumerateErrorFields = (e: t.Errors) =>
  `${e.map(({ context }) => context.map(({ key }) => key).join('.'))}`;

export function taskInstanceToAlertTaskInstance<Params extends RuleTypeParams>(
  taskInstance: ConcreteTaskInstance,
  alert?: SanitizedRule<Params>
): AlertTaskInstance {
  const params = pipe(
    ruleParamsSchema.decode(taskInstance.params),
    fold((e: t.Errors) => {
      throw new Error(
        `Task "${taskInstance.id}" ${
          alert ? `(underlying Alert "${alert.id}") ` : ''
        }has an invalid param at ${enumerateErrorFields(e)}`
      );
    }, t.identity)
  );

  return {
    ...taskInstance,
    params: {
      ...params,
      // `spaceId` is optional in the persisted params (legacy tasks predate it).
      // Default to the built-in space and brand it here, at this trusted
      // deserialization boundary, so the branded SpaceId flows downstream.
      // `brandSpaceId` never throws, so legacy/corrupt data can't take a rule
      // out of execution.
      spaceId: brandSpaceId(params.spaceId ?? DEFAULT_SPACE_ID),
    },
    state: taskInstance.state as RuleTaskState,
  };
}
