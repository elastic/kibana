/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const MAX_CELLS = 200;
export const MAX_TITLE_LENGTH = 1024;
export const MAX_DESCRIPTION_LENGTH = 10_000;
export const MAX_QUERY_LENGTH = 20_000;
export const MAX_MARKDOWN_LENGTH = 100_000;
export const MAX_LENS_ATTRIBUTES_LENGTH = 200_000;
const MAX_ID_LENGTH = 256;
const MAX_NAME_LENGTH = 256;
const MAX_VALUE_LENGTH = 1024;

const idSchema = schema.string({ minLength: 1, maxLength: MAX_ID_LENGTH });
const runModeSchema = schema.oneOf([schema.literal('auto'), schema.literal('manual')]);
const querySchema = schema.string({ maxLength: MAX_QUERY_LENGTH });

const lensAttributesSchema = schema.object(
  {},
  {
    unknowns: 'allow',
    validate: (attributes) => {
      if (JSON.stringify(attributes).length > MAX_LENS_ATTRIBUTES_LENGTH) {
        return `lensAttributes must serialize to at most ${MAX_LENS_ATTRIBUTES_LENGTH} characters`;
      }
    },
  }
);

const inputSchema = schema.discriminatedUnion('kind', [
  schema.object({
    kind: schema.literal('time'),
    defaultValue: schema.object({
      from: schema.string({ maxLength: MAX_VALUE_LENGTH }),
      to: schema.string({ maxLength: MAX_VALUE_LENGTH }),
    }),
    pinned: schema.maybe(schema.boolean()),
  }),
  schema.object({
    kind: schema.literal('dropdown'),
    optionsQuery: querySchema,
    defaultValue: schema.nullable(schema.string({ maxLength: MAX_VALUE_LENGTH })),
  }),
  schema.object({
    kind: schema.literal('range'),
    min: schema.number(),
    max: schema.number(),
    step: schema.maybe(schema.number({ min: 0 })),
    defaultValue: schema.nullable(schema.arrayOf(schema.number(), { minSize: 2, maxSize: 2 })),
  }),
]);

const cellBaseProps = {
  id: idSchema,
  name: schema.string({ maxLength: MAX_NAME_LENGTH }),
};

const cellSchema = schema.discriminatedUnion('type', [
  schema.object({
    ...cellBaseProps,
    type: schema.literal('esql'),
    runMode: runModeSchema,
    query: querySchema,
  }),
  schema.object({
    ...cellBaseProps,
    type: schema.literal('chart'),
    runMode: runModeSchema,
    sourceCell: schema.nullable(idSchema),
    lensAttributes: schema.nullable(lensAttributesSchema),
  }),
  schema.object({
    ...cellBaseProps,
    type: schema.literal('markdown'),
    content: schema.string({ maxLength: MAX_MARKDOWN_LENGTH }),
  }),
  schema.object({
    ...cellBaseProps,
    type: schema.literal('input'),
    input: inputSchema,
  }),
]);

const cellsSchema = schema.recordOf(idSchema, cellSchema, {
  validate: (cells) => {
    if (Object.keys(cells).length > MAX_CELLS) {
      return `cells must contain at most ${MAX_CELLS} entries`;
    }
  },
});

const validateCellReferences = ({
  cellOrder,
  cells,
}: {
  cellOrder: string[];
  cells: TypeOf<typeof cellsSchema>;
}): string | undefined => {
  const mismatchedKey = Object.entries(cells).find(([key, { id }]) => key !== id);
  if (mismatchedKey) {
    return `cells key [${mismatchedKey[0]}] does not match its cell id [${mismatchedKey[1].id}]`;
  }
  const orderedIds = new Set(cellOrder);
  if (orderedIds.size !== cellOrder.length) {
    return 'cellOrder must not contain duplicate ids';
  }
  const cellIds = Object.keys(cells);
  if (cellIds.length !== orderedIds.size || cellIds.some((id) => !orderedIds.has(id))) {
    return 'cellOrder must list exactly the ids in cells';
  }
};

/** Validates notebook attributes on HTTP input and saved object creation. */
export const notebookAttributesSchema = schema.object(
  {
    title: schema.string({ maxLength: MAX_TITLE_LENGTH }),
    description: schema.maybe(schema.string({ maxLength: MAX_DESCRIPTION_LENGTH })),
    cellOrder: schema.arrayOf(idSchema, { maxSize: MAX_CELLS }),
    cells: cellsSchema,
  },
  { validate: validateCellReferences }
);

export type StoredNotebookAttributes = TypeOf<typeof notebookAttributesSchema>;
