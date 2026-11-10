/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';

/** One materialized node: its size against the input budget, and what limits it hit. */
export interface MaterializeEvent {
  saved_object_type: string;
  outcome: 'node' | 'unsupported';
  node_type: string;
  /** 0 for the requested object, 1 for a dashboard's panels, and so on. */
  depth: number;
  values: number;
  characters: number;
  duration_ms: number;
  data_requests: number;
  row_caps_hit: number;
  budget_refused: boolean;
}

/** One render of a composition that holds materialized nodes. */
export interface RenderEvent {
  surface: string;
  node_count: number;
  values: number;
  characters: number;
  duration_ms: number;
  /** Characters of the rendered output: HTML, text, Markdown, or Slack's blocks as JSON. */
  output_characters: number;
  budget_refused: boolean;
}

export const MATERIALIZE_EVENT: EventTypeOpts<MaterializeEvent> = {
  eventType: 'isomer_materialize',
  schema: {
    saved_object_type: {
      type: 'keyword',
      _meta: { description: 'The saved object type materialized, such as lens.' },
    },
    outcome: {
      type: 'keyword',
      _meta: { description: 'node when a node was produced, unsupported otherwise.' },
    },
    node_type: {
      type: 'keyword',
      _meta: { description: 'The Isomer node type returned, such as metric or unsupported.' },
    },
    depth: {
      type: 'integer',
      _meta: { description: 'How deeply the object was nested: 0 for the requested object.' },
    },
    values: {
      type: 'long',
      _meta: { description: "Values in the node, counted as Isomer's input budget counts them." },
    },
    characters: {
      type: 'long',
      _meta: {
        description: "Characters in the node, counted as Isomer's input budget counts them.",
      },
    },
    duration_ms: {
      type: 'long',
      _meta: { description: 'Milliseconds to load, query, map and validate the node.' },
    },
    data_requests: {
      type: 'integer',
      _meta: { description: 'Data requests the materializer planned.' },
    },
    row_caps_hit: {
      type: 'integer',
      _meta: { description: 'Data requests whose rows were capped.' },
    },
    budget_refused: {
      type: 'boolean',
      _meta: { description: "Whether the node was over Isomer's input budget." },
    },
  },
};

export const RENDER_EVENT: EventTypeOpts<RenderEvent> = {
  eventType: 'isomer_render',
  schema: {
    surface: {
      type: 'keyword',
      _meta: { description: 'The surface rendered: html, text, markdown or slack.' },
    },
    node_count: {
      type: 'integer',
      _meta: { description: "Nodes in the composition's body." },
    },
    values: {
      type: 'long',
      _meta: {
        description: "Values in the composition, counted as Isomer's input budget counts them.",
      },
    },
    characters: {
      type: 'long',
      _meta: {
        description: "Characters in the composition, counted as Isomer's input budget counts them.",
      },
    },
    duration_ms: {
      type: 'long',
      _meta: { description: 'Milliseconds the render took.' },
    },
    output_characters: {
      type: 'long',
      _meta: { description: 'Characters in the rendered output.' },
    },
    budget_refused: {
      type: 'boolean',
      _meta: {
        description: "Whether the render refused the composition as over Isomer's input budget.",
      },
    },
  },
};
