/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { nodeIdSchema } from '@kbn/custom-app-registry';
import type { Action } from '@kbn/custom-app-registry';
import { stateKeySchema } from './bindings';
import {
  MAX_HEADING_LENGTH,
  MAX_INPUT_OPTIONS,
  MAX_LINK_APP_ID_LENGTH,
  MAX_LINK_PATH_LENGTH,
  MAX_NODE_ID_LENGTH,
  MAX_STATE_STRING_LENGTH,
} from './constants';
import { actionsSchema } from './action_schemas';

/**
 * Where a link goes, always inside Kibana: the query of a component opened in Discover, a page of
 * any Kibana application, or another custom app. A path starts at the application, so it can never
 * name another site.
 */
export const linkTargetSchema = lazySchema(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('discover'),
      /** The id of the component whose ES|QL query is opened. */
      from: nodeIdSchema,
    }),
    z.object({
      type: z.literal('app'),
      /** The id of the application, as Kibana knows it, such as `dashboards` or `discover`. */
      app: z
        .string()
        .min(1)
        .max(MAX_LINK_APP_ID_LENGTH)
        .regex(/^[A-Za-z0-9_:.-]+$/),
      /** Where in the application. `{{state.key}}` in it is replaced with the value, made safe for a path. */
      path: z
        .string()
        .max(MAX_LINK_PATH_LENGTH)
        // Not a scheme (`https:`), and not `//host`: it is a place in the application, not a site.
        .refine((path) => !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(path) && !/^[\\/]{2}/.test(path), {
          message: 'A path is a place in the application, not an address',
        })
        .optional(),
    }),
    z.object({
      type: z.literal('custom_app'),
      /** The id of a saved custom app. */
      id: z.string().min(1).max(MAX_NODE_ID_LENGTH),
    }),
  ])
);

export const inputOptionSchema = lazySchema(() =>
  z.object({
    value: z.string().max(MAX_STATE_STRING_LENGTH),
    label: z.string().max(MAX_HEADING_LENGTH).optional(),
  })
);

const formFieldFields = {
  /** The value of the app the answer is put in when the form is submitted. */
  bind: stateKeySchema,
  label: lazySchema(() => z.string().min(1).max(MAX_HEADING_LENGTH)),
  /** A form is not submitted while a required field is empty. */
  required: lazySchema(() => z.boolean().optional()),
};

export const formFieldSchema = lazySchema(() =>
  z.discriminatedUnion('kind', [
    z.object({
      ...formFieldFields,
      kind: z.literal('text'),
      placeholder: z.string().max(MAX_HEADING_LENGTH).optional(),
    }),
    z.object({
      ...formFieldFields,
      kind: z.literal('textarea'),
      placeholder: z.string().max(MAX_HEADING_LENGTH).optional(),
    }),
    z.object({
      ...formFieldFields,
      kind: z.literal('select'),
      options: z.array(inputOptionSchema).min(1).max(MAX_INPUT_OPTIONS),
    }),
  ])
);

/** The settings every input has, with a description of each. */
export const describedInputProps = (): {
  label: z.ZodString;
  bind: typeof stateKeySchema;
  onChange: z.ZodDefault<z.ZodArray<z.ZodType<Action>>>;
} => ({
  label: z.string().max(MAX_HEADING_LENGTH).describe('What the input is for, shown beside it.'),
  bind: stateKeySchema.describe(
    'The text value of the app that the input sets. It must be declared as a string.'
  ),
  onChange: actionsSchema
    .default([])
    .describe('The actions to run after the value is set. "fromInput" is the value just entered.'),
});
