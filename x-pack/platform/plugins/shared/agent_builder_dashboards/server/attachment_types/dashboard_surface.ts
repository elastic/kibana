/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { SurfaceComposition } from '@kbn/agent-builder-server/attachments';
import {
  isSection,
  type AttachmentPanel,
  type DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_APP_ID } from '@kbn/deeplinks-analytics';
import { i18n } from '@kbn/i18n';
import type { ComponentsNode } from '@kbn/isomer-components';

interface PanelRow {
  title: string;
  type: string;
  section?: string;
}

const toPanelRow = ({ type, config: { title } }: AttachmentPanel, section?: string): PanelRow => ({
  title: typeof title === 'string' && title.trim() ? title : '',
  type,
  section,
});

const toPanelRows = (panels: DashboardAttachmentData['panels']): PanelRow[] =>
  panels.flatMap((widget) =>
    isSection(widget)
      ? widget.panels.map((panel) => toPanelRow(panel, widget.title))
      : [toPanelRow(widget)]
  );

/** A table of the dashboard's panels, with their section when the dashboard has any. */
const toPanelsTable = (rows: PanelRow[]): ComponentsNode[] => {
  if (rows.length === 0) {
    return [];
  }

  const hasSections = rows.some(({ section }) => section !== undefined);

  const columns = [
    i18n.translate('xpack.agentBuilderDashboards.attachments.dashboard.surface.panelColumn', {
      defaultMessage: 'Panel',
    }),
    i18n.translate('xpack.agentBuilderDashboards.attachments.dashboard.surface.typeColumn', {
      defaultMessage: 'Type',
    }),
    ...(hasSections
      ? [
          i18n.translate(
            'xpack.agentBuilderDashboards.attachments.dashboard.surface.sectionColumn',
            { defaultMessage: 'Section' }
          ),
        ]
      : []),
  ];

  return [
    {
      type: 'table',
      columns: columns.map((label) => ({ label })),
      rows: rows.map(({ title, type, section }) => [
        title || null,
        type,
        ...(hasSections ? [section ?? null] : []),
      ]),
    },
  ];
};

const toContextItems = (
  panelCount: number,
  timeRange: DashboardAttachmentData['time_range']
): Array<{ text: string }> => [
  {
    text: i18n.translate('xpack.agentBuilderDashboards.attachments.dashboard.surface.panelCount', {
      defaultMessage: '{count, plural, one {# panel} other {# panels}}',
      values: { count: panelCount },
    }),
  },
  ...(timeRange
    ? [
        {
          text: i18n.translate(
            'xpack.agentBuilderDashboards.attachments.dashboard.surface.timeRange',
            {
              defaultMessage: '{from} to {to}',
              values: { from: timeRange.from, to: timeRange.to },
            }
          ),
        },
      ]
    : []),
];

/** A button that opens the saved dashboard, or nothing for one that was never saved. */
const toOpenDashboardButton = (dashboardId?: string): ComponentsNode[] =>
  dashboardId
    ? [
        {
          type: 'actions',
          buttons: [
            {
              label: i18n.translate(
                'xpack.agentBuilderDashboards.attachments.dashboard.surface.openDashboard',
                { defaultMessage: 'Open dashboard' }
              ),
              app: DASHBOARD_APP_ID,
              path: `#/view/${encodeURIComponent(dashboardId)}`,
            },
          ],
        },
      ]
    : [];

/**
 * The dashboard as a card: its description, its panels by title and type, and a button to the
 * saved dashboard. The panels themselves are not drawn.
 */
export const toDashboardSurfaceComposition = ({
  data: { title, description, panels, time_range: timeRange },
  origin,
}: Attachment<typeof DASHBOARD_ATTACHMENT_TYPE, DashboardAttachmentData>): SurfaceComposition => {
  const rows = toPanelRows(panels);

  return {
    type: 'view',
    title,
    body: [
      ...(description?.trim() ? [{ type: 'markdown' as const, text: description }] : []),
      { type: 'context', items: toContextItems(rows.length, timeRange) },
      ...toPanelsTable(rows),
      ...toOpenDashboardButton(origin),
    ],
  };
};
