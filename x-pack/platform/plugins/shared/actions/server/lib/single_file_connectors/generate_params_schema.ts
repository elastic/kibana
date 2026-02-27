/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { z as z4 } from '@kbn/zod/v4';

import type { ActionTypeParams, ValidatorType } from '../../types';

export const generateParamsSchema = (
  actions: ConnectorSpec['actions']
): ValidatorType<ActionTypeParams> => {
  const actionKeys = Object.keys(actions);

  if (!actionKeys.length) throw new Error('No actions defined');

  const actionParamSchemas = actionKeys.map((key) =>
    z4
      .object({
        subAction: z4.literal(key),
        subActionParams: actions[key].input,
      })
      .strict()
  );

  return {
    schema: z4.discriminatedUnion('subAction', [
      // to make zod types happy
      actionParamSchemas[0],
      ...actionParamSchemas.slice(1),
    ]),
  };
};
