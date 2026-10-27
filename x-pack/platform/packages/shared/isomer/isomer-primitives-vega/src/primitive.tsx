/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  definePrimitive,
  nodeAnchor,
  type PrimitiveNode,
  type PrimitiveRenderContext,
  requiredString,
  z,
} from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';

import { vegaExample, vegaExamples } from './examples';
import {
  createVegaView,
  renderVegaSvg,
  toVegaSpec,
  type VegaChartInput,
  VegaRenderError,
} from './render';
import { isResultUrl, resultIssues, withResults } from './results';
import { isSpecObject, specIssues, stripSpec } from './spec';
import { cellText, describeDataset, primaryDataset } from './summary';
import { vegaBorealisAdaptiveTheme, vegaBorealisLightTheme } from './borealis_theme';
import type { VegaTheme } from './theme';

export const VEGA_INTERACTIVE = 'vegaInteractive';

/** Past this many characters of JSON a spec is carrying a dataset, not a chart. */
export const MAX_SPEC_CHARS = 1_000_000;
/** A host's query results, after pruning to what the drawing reads; more is a dataset, not a chart's. */
export const MAX_RESULTS_CHARS = 1_000_000;
export const MAX_RESULTS = 16;
export const MAX_CHART_SIDE = 4096;
export const MIN_CHART_SIDE = 16;
/** Rows the Markdown table shows before it summarizes the rest. */
export const MARKDOWN_ROWS = 5;
export const MARKDOWN_COLUMNS = 6;

const side = (what: string) =>
  z
    .number()
    .int()
    .min(MIN_CHART_SIDE)
    .max(MAX_CHART_SIDE)
    .describe(`The chart's ${what} in CSS pixels, including axes and legends.`);

/** Raster tiles under a chart; at most a 4 by 4 grid, as Kibana's map mode loads for one panel. */
export const MAX_BASEMAP_TILES = 16;
const MAX_TILE_SRC = 120_000;
/** Only an inline raster, so a tile can never fetch. */
const TILE_SRC = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

const basemapSchema = z
  .object({
    tiles: z
      .array(
        z.object({
          src: z.string().max(MAX_TILE_SRC).regex(TILE_SRC),
          x: z.number().finite(),
          y: z.number().finite(),
          width: z.number().positive().max(MAX_CHART_SIDE),
          height: z.number().positive().max(MAX_CHART_SIDE),
        })
      )
      .max(MAX_BASEMAP_TILES),
    attribution: z.string().max(400).optional(),
  })
  .describe(
    'Host-stamped map tiles drawn beneath the chart in its pixel frame, as Kibana map mode draws a Vega layer over its basemap. Models must not set this.'
  );

const round = (value: number) => Math.round(value * 100) / 100;

/** `svg` with `basemap`'s tiles as its first children, under everything Vega drew. */
const withBasemap = (svg: string, basemap: VegaNode['basemap']): string => {
  if (!basemap?.tiles.length) {
    return svg;
  }
  const tiles = basemap.tiles
    .filter(({ src }) => TILE_SRC.test(src))
    .map(
      ({ src, x, y, width, height }) =>
        `<image href="${src}" x="${round(x)}" y="${round(y)}" width="${round(
          width
        )}" height="${round(height)}" preserveAspectRatio="none"/>`
    )
    .join('');
  return svg.replace(/^(<svg[^>]*>)/, `$1<g data-isomer-vega-basemap="">${tiles}</g>`);
};

/** Where `spec` compiles and parses, the message why not; checked at validation so an author sees it. */
const parseProblem = (node: VegaChartInput): string | undefined => {
  try {
    createVegaView(toVegaSpec(node, vegaBorealisLightTheme)).finalize();
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

const specSchema = z
  .record(z.string(), z.unknown())
  .superRefine((spec, ctx) => {
    if (JSON.stringify(spec).length > MAX_SPEC_CHARS) {
      ctx.addIssue({
        code: 'custom',
        message: `is longer than ${MAX_SPEC_CHARS} characters of JSON`,
      });
    }
  })
  .describe(
    'The Vega or Vega-Lite spec. Data is inline under `values`, or a host result replaces a source’s `url`; nothing loads by URL, and marks cannot link.'
  );

const resultsSchema = z
  .array(
    z.object({
      path: z
        .array(z.union([z.string().max(100), z.number().int().min(0)]))
        .min(1)
        .max(16),
      values: z.unknown(),
      scope: z.literal('static'),
    })
  )
  .max(MAX_RESULTS)
  .superRefine((results, ctx) => {
    if (JSON.stringify(results).length > MAX_RESULTS_CHARS) {
      ctx.addIssue({
        code: 'custom',
        message: `is longer than ${MAX_RESULTS_CHARS} characters of JSON`,
      });
    }
  })
  .describe(
    'Host-stamped query results, each replacing the `url` of the data entry at its `path`, holding only what a static drawing reads. Models must not set this.'
  );

export const vegaSchema = z
  .object({
    type: z.literal('vega'),
    mode: z.enum(['vega', 'vega-lite']).describe('Which grammar `spec` is written in.'),
    spec: specSchema,
    width: side('width'),
    height: side('height'),
    caption: requiredString().describe(
      'One sentence saying what the chart shows. It is the alt text, and the whole chart on text surfaces.'
    ),
    basemap: basemapSchema.optional(),
    results: resultsSchema.optional(),
  })
  .check(
    z.superRefine((node, ctx) => {
      if (isSpecObject(node.spec)) {
        for (const { path, message } of specIssues(node.spec)) {
          // A source's `url` is allowed where a host result replaces it.
          if (!isResultUrl(path, node.results)) {
            ctx.addIssue({ code: 'custom', path: ['spec', ...path], message });
          }
        }
        for (const { path, message } of resultIssues(node.spec, node.results ?? [])) {
          ctx.addIssue({ code: 'custom', path: [...path], message });
        }
      }
      const problem = parseProblem(node);
      if (problem !== undefined) {
        ctx.addIssue({ code: 'custom', path: ['spec'], message: problem });
      }
    })
  )
  .describe('A chart drawn by the Vega runtime from a Vega or Vega-Lite spec with inline data.');

export type VegaNode = z.infer<typeof vegaSchema> & PrimitiveNode;

/** JSON safe inside a `<script>`: no `<` can close it and no line separator can break it. */
const scriptJson = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

export interface VegaPrimitiveOptions {
  /** The theme for the `react` and `html` surfaces, which have no frame palette. */
  theme?: VegaTheme;
  /** Maps the frame's resolved palette on the `snapshot` surface to a chart theme. */
  snapshotTheme?: (frameTheme: unknown) => VegaTheme;
}

const text = (node: VegaNode): string => {
  const data = primaryDataset(node.mode, withResults(node.spec, node.results));
  return data === undefined ? node.caption : `${node.caption} (Chart of ${describeDataset(data)}.)`;
};

const markdown = (node: VegaNode) => {
  const data = primaryDataset(node.mode, withResults(node.spec, node.results));
  if (data === undefined) {
    return md.paragraph(md.strong(node.caption));
  }
  const columns = data.fields.slice(0, MARKDOWN_COLUMNS);
  const shown = data.rows.slice(0, MARKDOWN_ROWS);
  const more = data.rows.length - shown.length;
  return [
    md.paragraph(md.strong(node.caption)),
    md.paragraph(md.emphasis(`Chart of ${describeDataset(data)}.`)),
    md.table(
      columns,
      shown.map((row) => columns.map((field) => cellText(row[field])))
    ),
    ...(more > 0 ? [md.paragraph(md.emphasis(`…and ${more} more.`))] : []),
  ].flat();
};

/** A `vega` primitive drawing with `options`' themes; {@link createVegaPack} wraps it. */
export const createVegaPrimitive = ({
  theme = vegaBorealisAdaptiveTheme,
  snapshotTheme = () => vegaBorealisLightTheme,
}: VegaPrimitiveOptions = {}) =>
  definePrimitive({
    type: 'vega',
    schema: vegaSchema,
    catalog: {
      type: 'vega',
      name: 'Vega chart',
      purpose:
        'Draw a chart no simpler primitive can: any Vega or Vega-Lite spec, with its data inline.',
      useWhen: [
        'The chart needs a mark, transform, or layout only a Vega grammar expresses.',
        'An existing Vega or Vega-Lite spec is the source, such as a dashboard panel.',
      ],
      avoidWhen: [
        'The data lives behind a URL; query it first and inline the rows.',
        'One number or a short list says it; a chart adds nothing.',
      ],
      example: vegaExample,
    },
    icon: {
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="2" y="9" width="3" height="5" rx=".5" fill="var(--isomer-icon-muted, #98a2b3)"/><rect x="6.5" y="6" width="3" height="8" rx=".5" fill="var(--isomer-icon-muted, #98a2b3)"/><rect x="11" y="3" width="3" height="11" rx=".5" fill="var(--isomer-icon-muted, #98a2b3)"/><polyline points="2,8 7,4.5 13,1.5" fill="none" stroke="var(--isomer-icon-accent, #3d5ad8)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    examples: vegaExamples,
    sanitize: (node) => (isSpecObject(node.spec) ? { ...node, spec: stripSpec(node.spec) } : null),
    metrics: { snapshotHeight: ({ height }) => height },
    renderers: {
      react: (node, { context, theme: frameTheme }) => {
        const chartTheme = frameTheme === undefined ? theme : snapshotTheme(frameTheme);
        const anchor = nodeAnchor(context, node);
        let vegaSpec;
        let svg;
        try {
          vegaSpec = toVegaSpec(node, chartTheme);
          ({ svg } = renderVegaSvg(vegaSpec, node));
          svg = withBasemap(svg, node.basemap);
        } catch (error) {
          const reason =
            error instanceof VegaRenderError || error instanceof Error
              ? error.message
              : String(error);
          return (
            <div data-isomer-vega="" data-isomer-vega-error={reason} {...anchor}>
              {node.caption}
            </div>
          );
        }
        // A browser re-render would draw the chart without its basemap, or hover over results pruned to the drawing.
        const interactive =
          frameTheme === undefined &&
          !node.basemap &&
          !node.results?.length &&
          (context as PrimitiveRenderContext | undefined)?.enhancements?.has(VEGA_INTERACTIVE);
        return (
          <div data-isomer-vega="" {...anchor}>
            <div
              data-isomer-vega-chart=""
              role="img"
              aria-label={node.caption}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            {interactive && (
              <script
                type="application/json"
                data-isomer-vega-spec=""
                dangerouslySetInnerHTML={{ __html: scriptJson(vegaSpec) }}
              />
            )}
          </div>
        );
      },
      text,
      markdown,
    },
  });
