/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  metricConfigSchemaESQL,
  gaugeConfigSchemaESQL,
  tagcloudConfigSchemaESQL,
  xyConfigSchemaESQL,
  regionMapConfigSchemaESQL,
  heatmapConfigSchemaESQL,
  datatableConfigSchemaESQL,
  pieConfigSchemaESQL,
  treemapConfigSchemaESQL,
  waffleConfigSchemaESQL,
  mosaicConfigSchemaESQL,
} from '@kbn/lens-embeddable-utils';

/**
 * Selector into the joi→JSON-schema document of a chart type.
 *
 * Either a plain JSON pointer navigated through `properties`/`items` segments
 * (`$ref`s are resolved transparently), or a pointer to a union (`anyOf`) node
 * plus a branch discriminator that picks exactly one union member by the value
 * its `properties[key]` accepts — union members are never selected by array
 * index.
 */
export type CapabilitySelector =
  | string
  | {
      pointer: string;
      branch: { key: string; value: string };
    };

export interface ChartCapability {
  /** One-line summary shown in the generated capability index. */
  blurb: string;
  /**
   * `data` capabilities change what data is fetched or bound (edits touching
   * them require the full generation pipeline); `presentation` capabilities
   * only change how the data is rendered.
   */
  kind: 'data' | 'presentation';
  /** Schema subtrees owned by this capability. */
  select: CapabilitySelector[];
}

interface ChartTypeRegistryEntry {
  schema: { validate: (config: unknown) => any; getSchema: () => any };
  /**
   * Capability manifest: named clusters of the converted JSON schema used to
   * generate the capability index, on-demand schema fragments, and the core
   * schema (see capabilities.ts). Together with `coreSelectors`, every leaf of
   * the converted schema must be claimed by exactly one capability — enforced
   * by the anti-drift tests in capabilities.test.ts.
   */
  capabilities?: Record<string, ChartCapability>;
  /**
   * Selectors for the schema parts that are always relevant and belong to no
   * capability (chart identity, title, ...).
   */
  coreSelectors?: CapabilitySelector[];
  prompt: {
    /**
     * Guidance used when selecting the best chart type for a user request.
     */
    selection: {
      description: string;
      guideline: string;
    };
    /**
     * Guidance used after this chart type has been selected, while generating
     * the Lens config JSON.
     */
    config?: {
      /**
       * Free-form chart-specific rules appended to the config-generation prompt.
       */
      perChartTypeRules?: string[];
      /**
       * Structured config-generation options consumed by specialized prompt
       * builders.
       */
      options?: {
        coloring?: {
          dynamic?: {
            /**
             * Recommended number of dynamic color bands for generated `steps[]`.
             *
             * This is prompt guidance, not a schema limit.
             */
            recommendedStepCount: number;
          };
          categorical?: true;
        };
      };
    };
  };
}

/**
 * Central registry for all supported chart types.
 *
 * To add a new chart type:
 * 1. Add its value to the `SupportedChartType` enum in agent-builder-common
 * 2. Ensure the ESQL schema is exported from kbn-lens-embeddable-utils
 * 3. Add one entry here with the schema import and LLM guidance
 *
 * TypeScript enforces exhaustiveness via `satisfies Record<SupportedChartType, ...>` —
 * a missing entry is a compile error.
 */
export const chartTypeRegistry: Record<SupportedChartType, ChartTypeRegistryEntry> = {
  [SupportedChartType.Metric]: {
    schema: metricConfigSchemaESQL,
    prompt: {
      selection: {
        description:
          'For displaying single numeric values, KPIs, or metrics with optional trend lines. Best for showing key performance indicators, counts, sums, averages, or other aggregate statistics.',
        guideline:
          "Choose 'metric' for single numerical statistics, aggregations, counts, or KPIs without ranges",
      },
      config: {
        options: {
          coloring: {
            dynamic: { recommendedStepCount: 3 },
          },
        },
      },
    },
  },
  [SupportedChartType.Gauge]: {
    schema: gaugeConfigSchemaESQL,
    prompt: {
      selection: {
        description:
          'For displaying a single metric value within a range with min/max/goal values. Best for showing progress, performance against targets, or values within bounds (e.g., "show CPU usage as a gauge", "display sales target progress").',
        guideline:
          "Choose 'gauge' when showing a value within a range, progress toward a goal, or performance against min/max thresholds",
      },
      config: {
        perChartTypeRules: [
          "Always omit the optional 'min' and 'max' fields from the final configuration.",
          'Do not infer, synthesize, or backfill gauge bounds from the ES|QL results or the user request.',
          'Only include goal/target-related fields when the user explicitly asks for a goal or threshold.',
        ],
        options: {
          coloring: {
            dynamic: { recommendedStepCount: 4 },
          },
        },
      },
    },
  },
  [SupportedChartType.XY]: {
    schema: xyConfigSchemaESQL,
    capabilities: {
      layer_data: {
        blurb:
          'ES|QL data source query, column-to-dimension bindings (x, y, breakdown_by), breakdown series collapsing, sampling, and per-layer global-filter opt-out.',
        kind: 'data',
        select: [
          '/properties/layers/items/properties/data_source',
          '/properties/layers/items/properties/x/properties/column',
          '/properties/layers/items/properties/y/items/properties/column',
          '/properties/layers/items/properties/breakdown_by/properties/column',
          '/properties/layers/items/properties/breakdown_by/properties/collapse_by',
          '/properties/layers/items/properties/sampling',
          '/properties/layers/items/properties/ignore_global_filters',
        ],
      },
      panel_filters: {
        blurb:
          'Panel-level filters applied to the query results: field conditions, condition groups, raw Elasticsearch DSL, or spatial filters.',
        kind: 'data',
        select: ['/properties/filters'],
      },
      legend: {
        blurb:
          'Legend visibility, placement (inside/outside), position, layout, size, columns, and per-series statistics.',
        kind: 'presentation',
        select: ['/properties/legend'],
      },
      axes: {
        blurb:
          'X/Y/Y2 axis configuration (titles, ticks, grid lines, label orientation, scale, domain bounds) and which Y axis each metric is plotted on.',
        kind: 'presentation',
        select: ['/properties/axis', '/properties/layers/items/properties/y/items/properties/axis'],
      },
      labels: {
        blurb: 'Display labels for the x, y, and breakdown dimensions (series/column names).',
        kind: 'presentation',
        select: [
          '/properties/layers/items/properties/x/properties/label',
          '/properties/layers/items/properties/y/items/properties/label',
          '/properties/layers/items/properties/breakdown_by/properties/label',
        ],
      },
      value_formatting: {
        blurb:
          'Value display formats (number/percent, bits/bytes, duration, custom pattern) for the x, y, and breakdown dimensions.',
        kind: 'presentation',
        select: [
          '/properties/layers/items/properties/x/properties/format',
          '/properties/layers/items/properties/y/items/properties/format',
          '/properties/layers/items/properties/breakdown_by/properties/format',
        ],
      },
      coloring: {
        blurb:
          'Series colors: static or auto color per Y metric, and categorical or gradient color mappings for breakdown values.',
        kind: 'presentation',
        select: [
          '/properties/layers/items/properties/y/items/properties/color',
          '/properties/layers/items/properties/breakdown_by/properties/color',
        ],
      },
      fitting: {
        blurb:
          'Missing-data handling for line/area series: fitting function, edge extension, and emphasis of fitted segments.',
        kind: 'presentation',
        select: ['/properties/styling/properties/fitting'],
      },
      styling: {
        blurb:
          'Visual styling: line/area interpolation, point markers, area fill opacity, bar settings and data labels, and overlays (current time marker, partial buckets).',
        kind: 'presentation',
        select: [
          '/properties/styling/properties/interpolation',
          '/properties/styling/properties/points',
          '/properties/styling/properties/areas',
          '/properties/styling/properties/bars',
          '/properties/styling/properties/overlays',
        ],
      },
    },
    coreSelectors: [
      '/properties/type',
      '/properties/title',
      '/properties/description',
      '/properties/layers/items/properties/type',
    ],
    prompt: {
      selection: {
        description:
          'For displaying time series, trends, comparisons, or distributions using line charts, bar charts, or area charts. Best for showing data over time, comparing multiple series, histograms, or any visualization with X and Y axes (e.g., "show request count over time", "compare sales by region as a bar chart", "display CPU usage trend as a line chart").',
        guideline:
          "Choose 'xy' when showing trends over time, comparing multiple data series, or displaying distributions with axes",
      },
      config: {
        perChartTypeRules: [
          'CRITICAL: For horizontal bars, use type: "bar_horizontal" with x = category field and y = metric field. Example: "top OS by count as horizontal bar" → type: "bar_horizontal", x: { column: "OS" }, y: [{ column: "Count" }]. Do NOT put the metric on x.',
          'Do NOT set axis titles. Rely on the visualization title and column labels to convey meaning. Set axis title visibility to false (e.g. { visible: false }) for both X and Y axes.',
        ],
      },
    },
  },
  [SupportedChartType.Heatmap]: {
    schema: heatmapConfigSchemaESQL,
    prompt: {
      selection: {
        description:
          'For showing density or intensity across two dimensions (x and y buckets) using color to encode metric values. Best for correlations, distribution grids, calendar heatmaps, or when both axes are categorical/time buckets and color represents magnitude (e.g., "errors by service by status code", "requests by hour of day and day of week").',
        guideline:
          "Choose 'heatmap' when both axes are buckets and you want to visualize density/intensity with color across the x/y grid",
      },
      config: {
        options: {
          coloring: {
            dynamic: { recommendedStepCount: 5 },
          },
        },
      },
    },
  },
  [SupportedChartType.Tagcloud]: {
    schema: tagcloudConfigSchemaESQL,
    prompt: {
      selection: {
        description:
          'For displaying word frequency or categorical data where text size represents value. Best for showing top terms, keywords, categories, or text-based aggregations (e.g., "show top error messages", "display most common tags").',
        guideline:
          "Choose 'tagcloud' when visualizing text/categorical data where frequency or count determines size",
      },
    },
  },
  [SupportedChartType.RegionMap]: {
    schema: regionMapConfigSchemaESQL,
    prompt: {
      selection: {
        description:
          'For choropleth or region-based maps that show a metric by geographic boundary (country, state, province, county, etc.). Best when the data includes region identifiers that can be joined to map boundaries (e.g., "show revenue by state on a map", "display incidents by country").',
        guideline:
          "Choose 'region_map' when comparing metrics across geographic regions and a map-based view is expected",
      },
    },
  },
  [SupportedChartType.Datatable]: {
    schema: datatableConfigSchemaESQL,
    prompt: {
      selection: {
        description:
          'For displaying data in a structured table format with sortable columns. Best for showing detailed records, precise numeric comparisons, or multi-dimensional breakdowns where exact values matter more than visual patterns (e.g., "list top 20 hosts by CPU usage", "show error counts by service and status code").',
        guideline:
          "Choose 'datatable' when the user needs precise values, sortable columns, or a spreadsheet-like view of the data",
      },
      config: {
        options: {
          coloring: {
            dynamic: { recommendedStepCount: 5 },
            categorical: true,
          },
        },
      },
    },
  },
  [SupportedChartType.Pie]: {
    schema: pieConfigSchemaESQL,
    prompt: {
      selection: {
        description:
          'For showing proportional composition or part-to-whole relationships as slices of a circle. Supports pie and donut variants. Best for showing percentage breakdowns with a small number of categories (e.g., "show traffic distribution by browser", "display error proportion by type as a donut chart").',
        guideline:
          "Choose 'pie' when showing part-to-whole proportions with a limited number of categories (ideally fewer than 7)",
      },
    },
  },
  [SupportedChartType.Treemap]: {
    schema: treemapConfigSchemaESQL,
    prompt: {
      selection: {
        description:
          'For showing hierarchical or proportional data as nested rectangles where area encodes magnitude. Best for visualizing size comparisons across categories with optional hierarchical grouping (e.g., "show disk usage by folder", "display log volume by service and host").',
        guideline:
          "Choose 'treemap' when comparing relative sizes across many categories or showing hierarchical breakdowns",
      },
    },
  },
  [SupportedChartType.Waffle]: {
    schema: waffleConfigSchemaESQL,
    prompt: {
      selection: {
        description:
          'For showing proportional data as a grid of small squares where filled squares represent the proportion. Best for intuitive percentage displays that are easier to read than pie charts (e.g., "show what percentage of requests are errors", "display completion rate").',
        guideline:
          "Choose 'waffle' when showing percentages or proportions in a visually intuitive grid format",
      },
    },
  },
  [SupportedChartType.Mosaic]: {
    schema: mosaicConfigSchemaESQL,
    prompt: {
      selection: {
        description:
          'For showing the relationship between two categorical variables using a tiled mosaic of rectangles where both area and position encode information. Best for cross-tabulation views (e.g., "show error distribution across services and environments", "display request methods by status code").',
        guideline:
          "Choose 'mosaic' when visualizing the joint distribution of two categorical dimensions",
      },
    },
  },
};

export type ChartTypeRegistry = typeof chartTypeRegistry;

export type VisualizationConfig = ReturnType<
  ChartTypeRegistry[SupportedChartType]['schema']['validate']
>;
