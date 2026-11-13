/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitive, definePrimitivePack } from '@elastic/isomer-sdk';

import { mapPrimitiveCatalogEntry } from './catalog';
import { mapExamples } from './examples';
import type { MapGeometry } from './geometry';
import { createMapModel } from './model';
import { renderMapMarkdown } from './renderers/markdown';
import { createMapReactRenderer } from './renderers/react';
import { renderMapText } from './renderers/text';
import { mapSchema } from './schema';
import type { MapNode } from './types';

export interface MapsPackOptions {
  /** Boundary files the static renderer draws: countries as the basemap, and the sets regions join to. */
  geometry?: MapGeometry;
}

const createMapPrimitive = ({ geometry = {} }: MapsPackOptions) =>
  definePrimitive<MapNode>({
    type: 'map',
    catalog: mapPrimitiveCatalogEntry,
    examples: mapExamples,
    schema: mapSchema,
    renderers: {
      react: createMapReactRenderer(geometry),
      text: renderMapText,
      markdown: renderMapMarkdown,
    },
    metrics: {
      snapshotHeight: (node) => createMapModel(node).height + (node.label ? 28 : 0),
    },
  });

/** The maps pack. Without `geometry` a map draws on a plain ground and lists its regions. */
export const defineMapsPack = (options: MapsPackOptions = {}) =>
  definePrimitivePack({
    id: 'maps',
    primitives: [createMapPrimitive(options)],
    slackAssetTypes: ['map'],
  });

export const mapsPack = defineMapsPack();
