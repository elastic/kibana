/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AnyPrimitiveDefinition,
  definePrimitiveFor,
  definePrimitivePack,
} from '@elastic/isomer-sdk';

import type { ChartDefinition, ChartNode } from './charts/define';
import { chartDefinitions } from './registry';
import type { ChartPackTypes } from './render/context';
import { chartReact } from './render/figure';
import { type ChartHeading, chartMarkdown, chartSlack, chartText } from './render/surfaces';
import { chartDistillery } from './theme/distillery';
import { createDistillateStyleAdapter } from './theme/style_adapter';

const definePrimitive = definePrimitiveFor<ChartPackTypes>();

const bind = <TNode extends ChartNode & ChartHeading>({
  type,
  catalog,
  examples,
  schema,
  read,
}: ChartDefinition<TNode>): AnyPrimitiveDefinition =>
  definePrimitive<TNode>({
    type,
    catalog,
    examples: [...examples],
    schema: schema as never,
    renderers: {
      react: chartReact(read),
      text: (node) => chartText(node, read(node)),
      markdown: (node) => chartMarkdown(node, read(node)),
      slack: (node) => chartSlack(node, read(node)),
    },
  });

/** The charts pack: every chart renders as its title, description, summary, and data table. */
export const chartsPack = definePrimitivePack({
  id: 'charts',
  primitives: chartDefinitions.map((definition) => bind<ChartNode & ChartHeading>(definition)),
  styleAdapter: createDistillateStyleAdapter(chartDistillery),
});
