/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const graphRequestSchema = schema.object({
  query: schema.object({
    actorIds: schema.arrayOf(schema.string()),
    eventIds: schema.arrayOf(schema.string()),
    // TODO: use zod for range validation instead of config schema
    start: schema.oneOf([schema.number(), schema.string()]),
    end: schema.oneOf([schema.number(), schema.string()]),
  }),
});

export const graphResponseSchema = () =>
  schema.object({
    nodes: schema.arrayOf(
      schema.oneOf([entityNodeDataSchema, groupNodeDataSchema, labelNodeDataSchema])
    ),
    edges: schema.arrayOf(edgeDataSchema),
  });

export const colorSchema = schema.oneOf([
  schema.literal('primary'),
  schema.literal('danger'),
  schema.literal('warning'),
]);

export const nodeShapeSchema = schema.oneOf([
  schema.literal('hexagon'),
  schema.literal('pentagon'),
  schema.literal('ellipse'),
  schema.literal('rectangle'),
  schema.literal('diamond'),
  schema.literal('label'),
  schema.literal('group'),
]);

export const nodeBaseDataSchema = schema.object({
  id: schema.string(),
  label: schema.maybe(schema.string()),
  icon: schema.maybe(schema.string()),
});

export const entityNodeDataSchema = schema.allOf([
  nodeBaseDataSchema,
  schema.object({
    color: colorSchema,
    shape: schema.oneOf([
      schema.literal('hexagon'),
      schema.literal('pentagon'),
      schema.literal('ellipse'),
      schema.literal('rectangle'),
      schema.literal('diamond'),
    ]),
  }),
]);

export const groupNodeDataSchema = schema.allOf([
  nodeBaseDataSchema,
  schema.object({
    shape: schema.literal('group'),
  }),
]);

export const labelNodeDataSchema = schema.allOf([
  nodeBaseDataSchema,
  schema.object({
    source: schema.string(),
    target: schema.string(),
    shape: schema.literal('label'),
    parentId: schema.maybe(schema.string()),
    color: colorSchema,
  }),
]);

export const edgeDataSchema = schema.object({
  id: schema.string(),
  source: schema.string(),
  sourceShape: nodeShapeSchema,
  target: schema.string(),
  targetShape: nodeShapeSchema,
  color: colorSchema,
});
