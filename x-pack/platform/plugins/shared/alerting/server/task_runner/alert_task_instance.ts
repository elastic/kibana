/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { pipe } from 'fp-ts/pipeable';
import { fold } from 'fp-ts/Either';
import { DEFAULT_SPACE_ID, brandSpaceId } from '@kbn/core-spaces-common';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { ruleParamsSchema } from '@kbn/alerting-state-types';
import type { SanitizedRule, RuleTaskState, RuleTypeParams } from '../../common';
import type { RuleTaskInstance } from './types';

const enumerateErrorFields = (e: t.Errors) =>
  `${e.map(({ context }) => context.map(({ key }) => key).join('.'))}`;

/**
 * Validates persisted rule task params and brands `spaceId` once at this trusted
 * deserialization boundary so the branded {@link SpaceId} flows downstream.
 *
 * Decode is used only for validation — the returned `params` keep the full
 * persisted bag (`consumer`, `adHocRunParamsId`, etc.), not just the schema fields.
 */
export function taskInstanceToAlertTaskInstance<Params extends RuleTypeParams>(
  taskInstance: ConcreteTaskInstance,
  alert?: SanitizedRule<Params>
): RuleTaskInstance {
  const decoded = pipe(
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
      // Keep the full persisted params bag; decode only validates required fields.
      ...taskInstance.params,
      // Re-assert validated fields so the return type isn't just the index signature.
      alertId: decoded.alertId,
      // `spaceId` is optional in the persisted params (legacy tasks predate it).
      // Default to the built-in space and brand it here, at this trusted
      // deserialization boundary, so the branded SpaceId flows downstream.
      // `brandSpaceId` never throws, so legacy/corrupt data can't take a rule
      // out of execution.
      spaceId: brandSpaceId(decoded.spaceId ?? DEFAULT_SPACE_ID),
    },
    state: taskInstance.state as RuleTaskState,
  };
}
