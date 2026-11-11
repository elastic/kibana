/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { actionSchema, type Action } from '@kbn/custom-app-registry';
import { MAX_ACTIONS_PER_EVENT, MAX_LIST_ITEMS, MAX_STATE_STRING_LENGTH } from './constants';

/** A text, a number or a boolean, as a value of the app. */
export const stateValueSchema = lazySchema(() =>
  z.union([z.string().max(MAX_STATE_STRING_LENGTH), z.number().finite(), z.boolean()])
);

/** A list of texts, such as the usernames to look for. */
export const listValueSchema = lazySchema(() =>
  z.array(z.string().max(MAX_STATE_STRING_LENGTH)).max(MAX_LIST_ITEMS)
);

/** Every state key needs a default so a query that uses it always has a value. */
export const stateDeclarationSchema = lazySchema(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('string'), default: z.string().max(MAX_STATE_STRING_LENGTH) }),
    z.object({ type: z.literal('number'), default: z.number().finite() }),
    z.object({ type: z.literal('boolean'), default: z.boolean() }),
    z.object({ type: z.literal('list'), default: listValueSchema }),
  ])
);

export { actionSchema };

/** What an event can do: the actions that are registered, a few at most. */
export const actionsSchema: z.ZodArray<z.ZodType<Action>> = lazySchema(() =>
  z.array(actionSchema).max(MAX_ACTIONS_PER_EVENT)
);
