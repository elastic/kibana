/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import {
  buildTimeRangeParams,
  buildTimeSeriesTimeRangeFilter,
  executeEsql,
} from '@kbn/agent-builder-genai-utils/tools/utils/esql';
import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { getErrorMessage } from '@kbn/dashboard-agent-authoring';
import { PANEL_PREVIEW_ATTACHMENT_TYPE } from '../../../common';
import type {
  PanelPreviewRenderer,
  PreviewContext,
  PreviewEmsSettings,
  PreviewPanelConfig,
} from './types';

// Every preview is sent to the model as an image; the chat accepts up to 10 per round.
const MAX_PREVIEWS = 6;
// Charts plot aggregated rows, so this only guards against an unbounded query.
const MAX_ROWS = 5000;

/** Kibana advanced settings previews follow. */
export interface PreviewSettings {
  /** `dateFormat:tz`; `Browser` cannot be resolved on the server and becomes UTC. */
  timeZone: string;
  /** `dateFormat`. */
  dateFormat: string;
  /** `map.*` Elastic Maps Service settings, when the `mapsEms` plugin is available. */
  ems?: PreviewEmsSettings;
}

export interface PanelPreview {
  panel_id: string;
  attachment_id: string;
  title?: string;
}

interface PreviewablePanel {
  id: string;
  config: PreviewPanelConfig;
  renderer: PanelPreviewRenderer;
}

const isChartConfig = (
  config: AttachmentPanel['config']
): config is AttachmentPanel['config'] & PreviewPanelConfig => typeof config?.type === 'string';

const toPreviewablePanel =
  (renderers: Readonly<Record<string, PanelPreviewRenderer>>) =>
  ({ id, type, config }: AttachmentPanel): PreviewablePanel[] => {
    if (type !== LENS_EMBEDDABLE_TYPE || !isChartConfig(config)) {
      return [];
    }
    const renderer = renderers[config.type];
    return renderer ? [{ id, config, renderer }] : [];
  };

// A dashboard filters `FROM` queries on the data view's time field (`@timestamp` for ES|QL), so
// documents without that field, e.g. in an index that has none, are kept as they are.
const buildTimeRangeFilter = (
  query: string,
  timeRange: DashboardAttachmentData['time_range']
): QueryDslQueryContainer | undefined => {
  const timeSeriesFilter = buildTimeSeriesTimeRangeFilter(query, timeRange);
  const [start, end] = buildTimeRangeParams(timeRange) ?? [];
  if (timeSeriesFilter || !start || !end) {
    return timeSeriesFilter;
  }
  const range = {
    '@timestamp': {
      gte: String(start._tstart),
      lte: String(end._tend),
      format: 'strict_date_optional_time',
    },
  };
  return {
    bool: {
      should: [{ range }, { bool: { must_not: { exists: { field: '@timestamp' } } } }],
      minimum_should_match: 1,
    },
  };
};

const toPng = async (svg: string): Promise<Buffer> => {
  // Spike only: sharp is a dev dependency of Kibana.
  const { default: sharp } = await import('sharp');
  return sharp(Buffer.from(svg), { density: 144 }).png().toBuffer();
};

/**
 * Renders a PNG preview of each given Lens panel from its config and its ES|QL data, and stores
 * each one as a panel preview attachment. Panels of other types or chart types are skipped.
 */
export const renderPanelPreviews = async ({
  dashboardData,
  panelIds,
  esClient,
  attachments,
  settings,
  logger,
}: {
  dashboardData: DashboardAttachmentData;
  panelIds: string[];
  esClient: IScopedClusterClient;
  attachments: AttachmentStateManager;
  settings: PreviewSettings;
  logger: Logger;
}): Promise<PanelPreview[]> => {
  const ids = new Set(panelIds);
  // Renderers pull in Elastic Charts, EUI palettes and the preview font, so they load on first use.
  const { PREVIEW_RENDERERS } = await import('./preview_renderers');
  const panels = dashboardData.panels
    .flatMap((widget) => (isSection(widget) ? widget.panels : [widget]))
    .filter((panel) => ids.has(panel.id))
    .flatMap(toPreviewablePanel(PREVIEW_RENDERERS))
    .slice(0, MAX_PREVIEWS);
  const timeRange = dashboardData.time_range;
  const [start, end] = buildTimeRangeParams(timeRange) ?? [];
  const baseContext: Omit<PreviewContext, 'extraTables'> = {
    timeZone: settings.timeZone === 'Browser' ? 'UTC' : settings.timeZone,
    dateFormat: settings.dateFormat,
    ems: settings.ems,
    timeRange:
      start && end
        ? { min: Date.parse(String(start._tstart)), max: Date.parse(String(end._tend)) }
        : undefined,
  };

  const previews = await Promise.all(
    panels.map(async ({ id: panelId, config, renderer }): Promise<PanelPreview | undefined> => {
      try {
        const query = renderer.getQuery(config);
        if (!query) {
          return undefined;
        }
        const startedAt = performance.now();
        const runQuery = (esql: string) =>
          executeEsql({
            query: esql,
            params: buildTimeRangeParams(timeRange),
            filter: buildTimeRangeFilter(esql, timeRange),
            limit: MAX_ROWS,
            // Lens sends the user's time zone too, so `BUCKET` days start at local midnight.
            timeZone: baseContext.timeZone,
            // Lens reads the interval of `BUCKET` columns from their metadata.
            columnMetadata: true,
            esClient: esClient.asCurrentUser,
          });
        const extraQueries = Object.entries(renderer.getExtraQueries?.(config) ?? {});
        const [table, ...extraResults] = await Promise.all([
          runQuery(query),
          ...extraQueries.map(([, extraQuery]) => runQuery(extraQuery)),
        ]);
        const extraTables = Object.fromEntries(
          extraQueries.map(([name], index) => [name, extraResults[index]])
        );
        const png = await toPng(
          await renderer.renderSvg(config, table, { ...baseContext, extraTables })
        );
        const attachment = await attachments.add({
          type: PANEL_PREVIEW_ATTACHMENT_TYPE,
          description: `Preview: ${config.title ?? panelId}`,
          data: {
            panel_id: panelId,
            title: config.title,
            mime_type: 'image/png',
            data: png.toString('base64'),
          },
        });
        if (attachment) {
          attachments.showInline(attachment.id);
        }
        logger.debug(
          `Rendered preview of panel "${panelId}" in ${Math.round(
            performance.now() - startedAt
          )} ms`
        );
        return attachment
          ? { panel_id: panelId, attachment_id: attachment.id, title: config.title }
          : undefined;
      } catch (error) {
        logger.warn(`Failed to render a preview of panel "${panelId}": ${getErrorMessage(error)}`);
        return undefined;
      }
    })
  );
  return previews.filter((preview): preview is PanelPreview => preview !== undefined);
};
