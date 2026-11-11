/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { listActions } from './capability_registry';
import type { Action } from '.';

/** The schema of each type of action: those of the actions registered. */
export const getActionSchemas = (): readonly z.ZodObject<z.ZodRawShape>[] =>
  listActions().map((action) =>
    z.object({ type: z.literal(action.id), ...action.props.shape })
  ) as unknown as readonly z.ZodObject<z.ZodRawShape>[];

/** An action of any type. It is made when it is first used, so that the actions are there. */
export const actionSchema: z.ZodType<Action> = z.lazy(
  () => z.discriminatedUnion('type', getActionSchemas() as never) as unknown as z.ZodType<Action>
);
