/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import {
  definePrimitiveFor,
  definePrimitivePack,
  type DefaultPackTypes,
  nodeAnchor,
  type PrimitiveNode,
  type StyledRenderContext,
  unresolvedBodyNodeSchema,
  z,
} from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { slackContainer } from '@elastic/isomer-sdk/slack';
import {
  ISOMER_STYLE_COLLECTOR,
  classNames,
  isomerDistillery,
  isomerStyleAdapter,
} from '@kbn/isomer-theme';

import {
  DASHBOARD_GRID,
  type GridBox,
  gridHeight,
  PANEL_CHROME,
  panelBodySize,
  readingOrder,
  stackedHeight,
} from './geometry';

interface DashboardPackTypes extends DefaultPackTypes {
  context: StyledRenderContext;
}

const definePrimitive = definePrimitiveFor<DashboardPackTypes>();

/** `grid` lays panels out as Kibana does; `stack` puts them in one column in reading order, as on a phone. */
export type DashboardLayout = 'grid' | 'stack';

export interface DashboardPanel {
  id: string;
  title?: string;
  grid: GridBox;
  /** The panel's content. */
  body?: PrimitiveNode;
  /** Why the panel has no content, and where it is in Kibana. */
  placeholder?: { reason: string; href?: string };
  /** `none` for a body that draws its own frame, such as a Lens metric: it fills the panel edge to edge. */
  frame?: 'panel' | 'none';
}

export interface DashboardNode extends PrimitiveNode {
  type: 'dashboard';
  title: string;
  description?: string;
  /** The window the panels show, as words, e.g. "Oct 13 – Oct 20, 2026". */
  period?: string;
  layout?: DashboardLayout;
  panels: readonly DashboardPanel[];
}

const MAX_PANELS = 100;
const text = (max: number) => z.string().min(1).max(max);

const gridSchema = z
  .object({
    x: z
      .number()
      .int()
      .min(0)
      .max(DASHBOARD_GRID.columns - 1),
    y: z.number().int().min(0).max(10_000),
    w: z.number().int().min(1).max(DASHBOARD_GRID.columns),
    h: z.number().int().min(1).max(1000),
  })
  .strict()
  .describe('The panel’s place on Kibana’s grid: 48 columns, 20-pixel rows.');

const panelSchemaFor = (bodyNodeSchema: z.ZodType) =>
  z
    .object({
      id: text(200),
      title: text(500).optional(),
      grid: gridSchema,
      body: bodyNodeSchema.optional().describe('The panel’s content.'),
      placeholder: z
        .object({ reason: text(2000), href: z.string().url().max(2000).optional() })
        .strict()
        .optional()
        .describe('Why the panel has no content, and its link in Kibana.'),
      frame: z
        .enum(['panel', 'none'])
        .optional()
        .describe(
          '`none` lets a body that draws its own frame fill the panel. Defaults to `panel`.'
        ),
    })
    .strict();

const schemaFor = (bodyNodeSchema: z.ZodType) =>
  z.object({
    type: z.literal('dashboard'),
    title: text(500),
    description: text(2000).optional(),
    period: text(200).optional(),
    layout: z.enum(['grid', 'stack']).optional().describe('Defaults to grid.'),
    panels: z.array(panelSchemaFor(bodyNodeSchema)).min(1).max(MAX_PANELS),
  });

const dashboardSchema = schemaFor(unresolvedBodyNodeSchema);

const { handles } = isomerDistillery.createStyleModule(
  'isomerDashboard',
  ({ css, tokens: { color, font, size, border } }) => ({
    root: css`
      display: flex;
      flex-direction: column;
      gap: ${size.m};
      font-family: ${font.family.sans};
      color: ${color.text.paragraph};
    `,
    header: css`
      display: flex;
      flex-direction: column;
      gap: ${size.xs};
    `,
    title: css`
      margin: 0;
      color: ${color.text.heading};
      font-size: ${font.size.xl};
      font-weight: ${font.weight.bold};
      line-height: ${font.lineHeight.xl};
    `,
    meta: css`
      margin: 0;
      color: ${color.text.subdued};
      font-size: ${font.size.s};
      line-height: ${font.lineHeight.s};
    `,
    grid: css`
      position: relative;
    `,
    stack: css`
      display: flex;
      flex-direction: column;
      gap: ${DASHBOARD_GRID.gutter}px;
    `,
    cell: css`
      position: absolute;
      box-sizing: border-box;
      display: flex;
    `,
    panel: css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      padding: ${PANEL_CHROME.padding}px;
      background: ${color.background.plain};
      border: ${border.width.thin} solid ${color.border.subdued};
      border-radius: ${border.radius.panel};
    `,
    panelTitle: css`
      flex: none;
      margin: 0 0 ${size.xs};
      height: ${PANEL_CHROME.header - PANEL_CHROME.padding}px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: ${color.text.heading};
      font-size: ${font.size.s};
      font-weight: ${font.weight.semiBold};
      line-height: ${font.lineHeight.s};
    `,
    panelBody: css`
      flex: 1 1 0;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
    `,
    frameless: css`
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
    `,
    placeholder: css`
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: ${size.xs};
      height: 100%;
      color: ${color.text.subdued};
      font-size: ${font.size.s};
      text-align: center;
    `,
  })
);

const HEADER_HEIGHT = { title: 36, meta: 22, gap: 16 } as const;

const headerHeight = ({ description, period }: DashboardNode): number =>
  HEADER_HEIGHT.title +
  (description ? HEADER_HEIGHT.meta : 0) +
  (period ? HEADER_HEIGHT.meta : 0) +
  HEADER_HEIGHT.gap;

/** The dashboard's height on `snapshot`, header and panels. */
const snapshotHeight = (node: DashboardNode): number =>
  headerHeight(node) +
  (node.layout === 'stack'
    ? node.panels.reduce(
        (height, { grid }) => height + stackedHeight(grid) + DASHBOARD_GRID.gutter,
        0
      )
    : gridHeight(node.panels.map(({ grid }) => grid)));

const percent = (part: number) => `${(part / DASHBOARD_GRID.columns) * 100}%`;

const Placeholder = ({
  context,
  placeholder,
}: {
  context: StyledRenderContext | undefined;
  placeholder: DashboardPanel['placeholder'];
}): ReactNode => (
  <div className={classNames(context, handles.placeholder)}>
    <span>{placeholder?.reason ?? 'Nothing to show'}</span>
    {placeholder?.href && <a href={placeholder.href}>Open in Kibana</a>}
  </div>
);

const example: DashboardNode = {
  type: 'dashboard',
  title: '[Logs] Web Traffic',
  period: 'Oct 13 – Oct 20, 2026',
  panels: [
    {
      id: 'notes',
      title: 'Notes',
      grid: { x: 0, y: 0, w: 16, h: 8 },
      body: { type: 'markdown', text: 'Traffic from the **web** tier.' } as PrimitiveNode,
    },
    {
      id: 'unique-visitors',
      title: 'Unique visitors',
      grid: { x: 16, y: 0, w: 32, h: 8 },
      placeholder: { reason: 'This panel type has no Isomer node yet.' },
    },
  ],
};

export const dashboard = definePrimitive<DashboardNode, typeof dashboardSchema>({
  type: 'dashboard',
  schema: dashboardSchema,
  schemaFor: (bodyNodeSchema) => schemaFor(bodyNodeSchema),
  catalog: {
    type: 'dashboard',
    purpose:
      'A Kibana dashboard: titled panels on its 48-column grid, or in one column for a phone.',
    useWhen: ['Rendering a converted Kibana dashboard as one document.'],
    avoidWhen: ['A single chart or table. Use that node directly.'],
    example,
  },
  examples: [example, { ...example, layout: 'stack' as const }],
  children: ({ panels }) =>
    panels.flatMap(({ body }, index) =>
      body ? [{ node: body, path: `panels[${index}].body` }] : []
    ),
  metrics: { snapshotHeight },
  renderers: {
    react: (node, { context, scope }) => {
      const { title, description, period, panels } = node;
      const stacked = node.layout === 'stack';
      const panelContent = ({ title: panelTitle, body, placeholder, frame }: DashboardPanel) =>
        frame === 'none' && body ? (
          <div className={classNames(context, handles.frameless)}>
            {scope.renderReact(body, context)}
          </div>
        ) : (
          <div className={classNames(context, handles.panel)}>
            {panelTitle && (
              <h3 className={classNames(context, handles.panelTitle)}>{panelTitle}</h3>
            )}
            <div className={classNames(context, handles.panelBody)}>
              {body ? (
                scope.renderReact(body, context)
              ) : (
                <Placeholder {...{ context, placeholder }} />
              )}
            </div>
          </div>
        );
      return (
        <div
          {...nodeAnchor(context, node)}
          className={classNames(context, handles.root)}
          data-layout={stacked ? 'stack' : 'grid'}
        >
          <header className={classNames(context, handles.header)}>
            <h2 className={classNames(context, handles.title)}>{title}</h2>
            {description && <p className={classNames(context, handles.meta)}>{description}</p>}
            {period && <p className={classNames(context, handles.meta)}>{period}</p>}
          </header>
          {stacked ? (
            <div className={classNames(context, handles.stack)}>
              {readingOrder(panels).map((panel) => (
                <div key={panel.id} style={{ display: 'flex', height: stackedHeight(panel.grid) }}>
                  {panelContent(panel)}
                </div>
              ))}
            </div>
          ) : (
            <div
              className={classNames(context, handles.grid)}
              style={{ height: gridHeight(panels.map(({ grid }) => grid)) }}
            >
              {panels.map((panel) => {
                const { x, y, w, h } = panel.grid;
                return (
                  <div
                    key={panel.id}
                    className={classNames(context, handles.cell)}
                    style={{
                      left: percent(x),
                      top: y * DASHBOARD_GRID.row,
                      width: percent(w),
                      height: h * DASHBOARD_GRID.row,
                      paddingRight: DASHBOARD_GRID.gutter,
                      paddingBottom: DASHBOARD_GRID.gutter,
                    }}
                  >
                    {panelContent(panel)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    },
    text: ({ title, description, period, panels }, { scope }) =>
      [
        title,
        description,
        period,
        ...readingOrder(panels).map(({ title: panelTitle, body, placeholder }) =>
          [panelTitle, body ? scope.renderText(body) : placeholder?.reason]
            .filter(Boolean)
            .join('\n')
        ),
      ]
        .filter(Boolean)
        .join('\n\n'),
    markdown: ({ title, description, period, panels }, { scope }) => [
      md.heading(2, title),
      ...(description ? [md.paragraph(description)] : []),
      ...(period ? [md.paragraph(period)] : []),
      ...readingOrder(panels).flatMap(({ title: panelTitle, body, placeholder }) => [
        ...(panelTitle ? [md.heading(3, panelTitle)] : []),
        ...(body
          ? [scope.renderMarkdownContent(body)]
          : placeholder
          ? [md.paragraph(placeholder.reason)]
          : []),
      ]),
    ],
    slack: ({ title, panels }, { collector, scope }) => [
      { type: 'header', text: { type: 'plain_text', text: title.slice(0, 150) } },
      ...readingOrder(panels).flatMap(({ title: panelTitle, body, placeholder }) => {
        const blocks = body
          ? scope.renderSlack(body, collector)
          : [
              {
                type: 'context' as const,
                elements: [{ type: 'plain_text' as const, text: placeholder?.reason ?? '—' }],
              },
            ];
        return panelTitle
          ? slackContainer(panelTitle.slice(0, 150), blocks, { fallbackLevel: 3 })
          : blocks;
      }),
    ],
  },
});

/**
 * The size `prepareCharts` draws a chart at: its panel's body, on a page `width` pixels wide. For `sizeFor`;
 * `undefined` outside a dashboard.
 */
export const dashboardChartSize =
  (width: number) =>
  (
    node: { id?: string },
    ancestors: readonly PrimitiveNode[]
  ): { width: number; height: number } | undefined => {
    const owner = [...ancestors].reverse().find((ancestor) => ancestor.type === 'dashboard') as
      | DashboardNode
      | undefined;
    const panel = owner?.panels.find(
      ({ body }) => body !== undefined && (body as { id?: string }).id === node.id
    );
    if (!owner || !panel) {
      return undefined;
    }
    return panelBodySize(
      { grid: panel.grid, titled: Boolean(panel.title), frameless: panel.frame === 'none' },
      { width, ...(owner.layout ? { layout: owner.layout } : {}) }
    );
  };

/** The dashboard pack: Kibana's dashboard grid as one node. */
export const dashboardPack = definePrimitivePack({
  id: 'dashboard',
  primitives: [dashboard],
  styleAdapter: isomerStyleAdapter,
  styleCollector: ISOMER_STYLE_COLLECTOR,
});
