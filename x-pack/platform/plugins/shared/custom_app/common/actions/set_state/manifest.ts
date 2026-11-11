/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineAction, type ActionOf } from '@kbn/custom-app-registry';
import {
  listValueSchema,
  MAX_HEADING_LENGTH,
  stateKeySchema,
  stateValueSchema,
} from '@kbn/custom-app-common';

export const setStateAction = defineAction({
  kind: 'action',
  id: 'setState',
  version: 1,
  props: lazySchema(() =>
    z.object({
      key: stateKeySchema.describe('The value of the app to set.'),
      value: z
        .union([
          stateValueSchema,
          listValueSchema,
          z.object({ fromColumn: z.string().min(1).max(MAX_HEADING_LENGTH) }),
          z.object({ fromInput: z.literal(true) }),
        ])
        .describe(
          'What to set it to: a fixed value, a column of the row that was clicked, or the new value of the input.'
        ),
    })
  ),
  doc: {
    summary: 'Sets a value of the app, which the components that read it follow.',
    whenToUse:
      'To remember a choice: a clicked row, a selected option. A column of the row works on a row click, and the value of the input on a change.',
    example: { type: 'setState', key: 'service', value: { fromColumn: 'service' } },
  },
  validate: (action, { nodeId, event, allowed, state, issue }) => {
    const declaration = state[action.key];
    if (!declaration) {
      issue(`Node "${nodeId}" sets unknown state key "${action.key}"`);
      return;
    }

    const { value } = action;
    if (Array.isArray(value)) {
      if (declaration.type !== 'list') {
        issue(`Node "${nodeId}" sets state key "${action.key}" (${declaration.type}) to a list`);
      }
    } else if (typeof value === 'object') {
      if ('fromColumn' in value && !allowed.fromColumn) {
        issue(`Node "${nodeId}": fromColumn is not valid in ${event}`);
      }
      if ('fromInput' in value && !allowed.fromInput) {
        issue(`Node "${nodeId}": fromInput is only valid on input nodes`);
      }
    } else if (typeof value !== declaration.type) {
      issue(
        `Node "${nodeId}" sets state key "${action.key}" (${declaration.type}) to a ${typeof value}`
      );
    }
  },
});

declare module '@kbn/custom-app-registry' {
  interface ActionTypeMap {
    setState: ActionOf<typeof setStateAction>;
  }
}
