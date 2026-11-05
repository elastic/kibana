/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH } from '@kbn/custom-content-common';
import {
  GRID_SUBDIVISIONS,
  MAX_CELL_HEIGHT,
  MAX_DESCRIPTION_LENGTH,
  MAX_GRID_COLUMNS,
  MAX_TITLE_LENGTH,
  MIN_GRID_COLUMNS,
} from '../common/constants';

export const MAX_CELLS = 200;
export const MAX_QUERY_LENGTH = 20_000;
export const MAX_MARKDOWN_LENGTH = 100_000;
export const MAX_CODE_LENGTH = 100_000;
export const MAX_LENS_ATTRIBUTES_LENGTH = 200_000;
const MAX_ID_LENGTH = 256;
const MAX_NAME_LENGTH = 256;
const MAX_VALUE_LENGTH = 1024;
const MAX_STATIC_OPTIONS = 1000;
const MAX_APPS = 20;
const MAX_GRID_UNITS = 1000;

const idSchema = schema.string({ minLength: 1, maxLength: MAX_ID_LENGTH });
const runModeSchema = schema.oneOf([schema.literal('auto'), schema.literal('manual')]);
const querySchema = schema.string({ maxLength: MAX_QUERY_LENGTH });
const cellHeightSchema = schema.maybe(schema.number({ min: 1, max: MAX_CELL_HEIGHT }));

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
    optionsSource: schema.maybe(
      schema.oneOf([schema.literal('query'), schema.literal('static'), schema.literal('cell')])
    ),
    optionsQuery: querySchema,
    staticOptions: schema.maybe(
      schema.arrayOf(schema.string({ maxLength: MAX_VALUE_LENGTH }), {
        maxSize: MAX_STATIC_OPTIONS,
      })
    ),
    optionsCell: schema.maybe(schema.nullable(idSchema)),
    optionsColumn: schema.maybe(schema.nullable(schema.string({ maxLength: MAX_NAME_LENGTH }))),
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
  label: schema.maybe(schema.string({ maxLength: MAX_TITLE_LENGTH })),
  outputNames: schema.maybe(
    schema.object({
      table: schema.maybe(schema.string({ maxLength: MAX_NAME_LENGTH })),
      value: schema.maybe(schema.string({ maxLength: MAX_NAME_LENGTH })),
      start: schema.maybe(schema.string({ maxLength: MAX_NAME_LENGTH })),
      end: schema.maybe(schema.string({ maxLength: MAX_NAME_LENGTH })),
      min: schema.maybe(schema.string({ maxLength: MAX_NAME_LENGTH })),
      max: schema.maybe(schema.string({ maxLength: MAX_NAME_LENGTH })),
    })
  ),
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
    height: cellHeightSchema,
  }),
  schema.object({
    ...cellBaseProps,
    type: schema.literal('custom'),
    runMode: runModeSchema,
    dataSource: schema.maybe(schema.oneOf([schema.literal('cell'), schema.literal('query')])),
    sourceCell: schema.nullable(idSchema),
    query: schema.maybe(querySchema),
    template: schema.string({ maxLength: CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH }),
    height: cellHeightSchema,
  }),
  schema.object({
    ...cellBaseProps,
    type: schema.literal('code'),
    runMode: runModeSchema,
    code: schema.string({ maxLength: MAX_CODE_LENGTH }),
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

const gridUnitSchema = schema.number({ min: 0, max: MAX_GRID_UNITS });
const panelSizeSchema = schema.number({ min: 1 / GRID_SUBDIVISIONS, max: MAX_GRID_UNITS });

const appSchema = schema.object({
  id: idSchema,
  title: schema.string({ maxLength: MAX_TITLE_LENGTH }),
  panels: schema.arrayOf(
    schema.object({
      id: idSchema,
      cellId: idSchema,
      x: gridUnitSchema,
      y: gridUnitSchema,
      width: panelSizeSchema,
      height: panelSizeSchema,
    }),
    { maxSize: MAX_CELLS }
  ),
  hideTimePicker: schema.maybe(schema.boolean()),
  freePlacement: schema.maybe(schema.boolean()),
  snapToGrid: schema.maybe(schema.boolean()),
  gridColumns: schema.maybe(
    schema.number({
      min: MIN_GRID_COLUMNS,
      max: MAX_GRID_COLUMNS,
      validate: (value) =>
        Number.isInteger(value) ? undefined : 'gridColumns must be a whole number',
    })
  ),
  heading: schema.maybe(schema.string({ maxLength: MAX_TITLE_LENGTH })),
  description: schema.maybe(schema.string({ maxLength: MAX_DESCRIPTION_LENGTH })),
});

const validateCellReferences = ({
  cellOrder,
  cells,
  panels = [],
}: {
  cellOrder: string[];
  cells: TypeOf<typeof cellsSchema>;
  panels?: Array<TypeOf<typeof appSchema>>;
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
  const orphan = panels.flatMap((app) => app.panels).find(({ cellId }) => !cells[cellId]);
  if (orphan) {
    return `panel [${orphan.id}] references unknown cell [${orphan.cellId}]`;
  }
};

/** Validates notebook attributes on HTTP input and saved object creation. */
export const notebookAttributesSchema = schema.object(
  {
    title: schema.string({ maxLength: MAX_TITLE_LENGTH }),
    description: schema.maybe(schema.string({ maxLength: MAX_DESCRIPTION_LENGTH })),
    cellOrder: schema.arrayOf(idSchema, { maxSize: MAX_CELLS }),
    cells: cellsSchema,
    panels: schema.maybe(schema.arrayOf(appSchema, { maxSize: MAX_APPS })),
  },
  { validate: validateCellReferences }
);

export type StoredNotebookAttributes = TypeOf<typeof notebookAttributesSchema>;
