/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { stateKeySchema } from './bindings';
import {
  MAX_ACTIONS_PER_EVENT,
  MAX_HEADING_LENGTH,
  MAX_LIST_ITEMS,
  MAX_STATE_STRING_LENGTH,
  MAX_WORKFLOW_ID_LENGTH,
  MAX_WORKFLOW_INPUT_NAME_LENGTH,
  MAX_WORKFLOW_INPUTS,
} from './constants';
import { nodeIdSchema } from './node_id_schema';

const stateValueSchema = lazySchema(() =>
  z.union([z.string().max(MAX_STATE_STRING_LENGTH), z.number().finite(), z.boolean()])
);

/** A list of texts, such as the usernames to look for. */
const listValueSchema = lazySchema(() =>
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

/** The closed set of things a user interaction can do. */
const setStateActionSchema = lazySchema(() =>
  z.object({
    type: z.literal('setState'),
    key: stateKeySchema,
    value: z.union([
      stateValueSchema,
      listValueSchema,
      z.object({ fromColumn: z.string().min(1).max(MAX_HEADING_LENGTH) }),
      z.object({ fromInput: z.literal(true) }),
    ]),
  })
);

/**
 * Runs a Workflow, as the person who triggered it, so it needs no more privilege than they have.
 * What it hands over is a closed set: a fixed value, a column of the row that was clicked, or a
 * value of the app. They travel as typed values and are never put together into text.
 */
const runWorkflowActionSchema = lazySchema(() =>
  z.object({
    type: z.literal('runWorkflow'),
    /** The id of the workflow, as the Workflows application knows it. */
    workflow: z.string().min(1).max(MAX_WORKFLOW_ID_LENGTH),
    inputs: z
      .record(
        z.string().min(1).max(MAX_WORKFLOW_INPUT_NAME_LENGTH),
        z.union([
          stateValueSchema,
          z.object({ fromColumn: z.string().min(1).max(MAX_HEADING_LENGTH) }),
          z.object({ fromState: stateKeySchema }),
        ])
      )
      .refine((inputs) => Object.keys(inputs).length <= MAX_WORKFLOW_INPUTS, {
        message: `An action may hand at most ${MAX_WORKFLOW_INPUTS} inputs to a workflow`,
      })
      .default({}),
  })
);

const openFlyoutActionSchema = lazySchema(() =>
  z.object({ type: z.literal('openFlyout'), flyout: nodeIdSchema })
);
const closeFlyoutActionSchema = lazySchema(() => z.object({ type: z.literal('closeFlyout') }));

export const actionSchema = lazySchema(() =>
  z.discriminatedUnion('type', [
    setStateActionSchema,
    openFlyoutActionSchema,
    closeFlyoutActionSchema,
    runWorkflowActionSchema,
  ])
);

export const actionsSchema = lazySchema(() => z.array(actionSchema).max(MAX_ACTIONS_PER_EVENT));
