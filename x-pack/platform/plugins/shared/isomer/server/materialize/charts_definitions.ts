/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyPrimitiveDefinition, GridNode } from '@kbn/isomer';
import {
  dataTableCatalog,
  dataTableExamples,
  dataTableSchema,
  definePrimitive,
  gaugeCatalog,
  gaugeExamples,
  gaugeSchema,
  gridCatalog,
  gridExamples,
  gridSchema,
  gridSchemaFor,
  heatmapCatalog,
  heatmapExamples,
  heatmapSchema,
  legacyMetricCatalog,
  legacyMetricExamples,
  legacyMetricSchema,
  metricCatalog,
  metricExamples,
  metricSchema,
  partitionChartCatalog,
  partitionChartExamples,
  partitionChartSchema,
  tagCloudCatalog,
  tagCloudExamples,
  tagCloudSchema,
  unsupportedCatalog,
  unsupportedExamples,
  unsupportedSchema,
  xyChartCatalog,
  xyChartExamples,
  xyChartSchema,
} from '@kbn/isomer';

// The charts pack publishes its schemas ahead of its renderers, so these definitions carry inert
// ones: they exist to validate nodes, `grid` panels included, never to render them.
const renderers = {
  react: () => null,
  text: () => '',
  markdown: () => [],
};

/** The charts pack's primitives, defined for validation only. */
export const chartsValidationDefinitions: readonly AnyPrimitiveDefinition[] = [
  definePrimitive({
    type: 'metric',
    schema: metricSchema,
    catalog: metricCatalog,
    examples: metricExamples,
    renderers,
  }),
  definePrimitive({
    type: 'xyChart',
    schema: xyChartSchema,
    catalog: xyChartCatalog,
    examples: xyChartExamples,
    renderers,
  }),
  definePrimitive({
    type: 'dataTable',
    schema: dataTableSchema,
    catalog: dataTableCatalog,
    examples: dataTableExamples,
    renderers,
  }),
  definePrimitive({
    type: 'partitionChart',
    schema: partitionChartSchema,
    catalog: partitionChartCatalog,
    examples: partitionChartExamples,
    renderers,
  }),
  definePrimitive({
    type: 'heatmap',
    schema: heatmapSchema,
    catalog: heatmapCatalog,
    examples: heatmapExamples,
    renderers,
  }),
  definePrimitive({
    type: 'gauge',
    schema: gaugeSchema,
    catalog: gaugeCatalog,
    examples: gaugeExamples,
    renderers,
  }),
  definePrimitive({
    type: 'tagCloud',
    schema: tagCloudSchema,
    catalog: tagCloudCatalog,
    examples: tagCloudExamples,
    renderers,
  }),
  definePrimitive({
    type: 'legacyMetric',
    schema: legacyMetricSchema,
    catalog: legacyMetricCatalog,
    examples: legacyMetricExamples,
    renderers,
  }),
  definePrimitive<GridNode>({
    type: 'grid',
    schema: gridSchema,
    schemaFor: (bodyNode) => gridSchemaFor(bodyNode),
    catalog: gridCatalog,
    examples: gridExamples,
    children: (node) => [
      ...node.panels.map((panel, index) => ({ node: panel.node, path: `panels[${index}].node` })),
      ...(node.sections ?? []).flatMap((section, sectionIndex) =>
        section.panels.map((panel, index) => ({
          node: panel.node,
          path: `sections[${sectionIndex}].panels[${index}].node`,
        }))
      ),
    ],
    renderers,
  }),
  definePrimitive({
    type: 'unsupported',
    schema: unsupportedSchema,
    catalog: unsupportedCatalog,
    examples: unsupportedExamples,
    renderers,
  }),
];
