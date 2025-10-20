/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Streams } from '@kbn/streams-schema';
import { suggestStreamDashboard } from '@kbn/streams-ai';
import { from, map } from 'rxjs';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
import { STREAMS_TIERED_ML_FEATURE } from '../../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { createServerRoute } from '../../../create_server_route';

export interface SuggestDashboardParams {
  path: {
    name: string;
  };
  body: {
    connector_id: string;
  };
}

export const suggestDashboardSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    connector_id: z.string(),
  }),
}) satisfies z.Schema<SuggestDashboardParams>;

/**
 * Converts the LLM's dashboard format into Kibana's dashboard saved object format
 */
function convertToKibanaDashboard(
  llmDashboard: Awaited<ReturnType<typeof suggestStreamDashboard>>,
  streamName: string
) {
  if (!llmDashboard) {
    return null;
  }

  // Create ad hoc data view for the stream
  const dataViewId = Buffer.from(`stream:${streamName}`).toString('hex');
  const adHocDataView = {
    id: dataViewId,
    title: streamName,
    timeFieldName: '@timestamp',
    sourceFilters: [],
    type: 'esql' as const,
    fieldFormats: {},
    runtimeFieldMap: {},
    allowNoIndex: false,
    name: streamName,
    allowHidden: false,
    managed: false,
  };

  // Convert panels to Lens visualizations
  const panels = llmDashboard.panels.map((panel, index) => {
    const panelUid = `panel-${index}`;
    const layerId = `layer-${index}`;

    // Get dimension column names from the panel
    const xAccessor = panel.dimensions?.x;
    const yAccessor = panel.dimensions?.y;
    const partitionAccessor = panel.dimensions?.partition;
    const valueAccessor = panel.dimensions?.value;
    const tableColumns = panel.dimensions?.columns || [];

    // Determine visualization type and configuration
    let visualizationType = 'lnsXY';
    let visualization: any = {
      legend: { isVisible: true, position: 'right' },
      valueLabels: 'hide',
      fittingFunction: 'Linear',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
      labelsOrientation: { x: 0, yLeft: 0, yRight: 0 },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      preferredSeriesType: 'bar_stacked',
      layers: [
        {
          layerId,
          accessors: yAccessor ? [yAccessor] : [],
          seriesType: 'bar_stacked',
          xAccessor: xAccessor || undefined,
          layerType: 'data',
        },
      ],
    };

    // Adjust visualization based on panel type
    if (panel.type === 'line_chart' || panel.type === 'area_chart') {
      const seriesType = panel.type === 'line_chart' ? 'line' : 'area';
      visualization.preferredSeriesType = seriesType;
      visualization.layers[0].seriesType = seriesType;
      visualization.layers[0].accessors = yAccessor ? [yAccessor] : [];
      visualization.layers[0].xAccessor = xAccessor || undefined;
    } else if (panel.type === 'bar_chart') {
      visualization.layers[0].accessors = yAccessor ? [yAccessor] : [];
      visualization.layers[0].xAccessor = xAccessor || undefined;
    } else if (panel.type === 'pie_chart') {
      visualizationType = 'lnsPie';
      visualization = {
        shape: 'pie',
        layers: [
          {
            layerId,
            primaryGroups: partitionAccessor ? [partitionAccessor] : [],
            metrics: valueAccessor ? [valueAccessor] : [],
            numberDisplay: 'percent',
            categoryDisplay: 'default',
            legendDisplay: 'default',
            nestedLegend: false,
            layerType: 'data',
            colorMapping: {
              assignments: [],
              specialAssignments: [],
              colorMode: { type: 'categorical' },
            },
          },
        ],
      };
    } else if (panel.type === 'data_table') {
      visualizationType = 'lnsDatatable';
      visualization = {
        layerId,
        layerType: 'data',
        columns: tableColumns.map((col, i) => ({
          columnId: col,
          isMetric: i !== 0,
          isTransposed: false,
        })),
      };
    }

    // Collect all column IDs used in this visualization
    const usedColumnIds = new Set<string>();
    if (xAccessor) usedColumnIds.add(xAccessor);
    if (yAccessor) usedColumnIds.add(yAccessor);
    if (partitionAccessor) usedColumnIds.add(partitionAccessor);
    if (valueAccessor) usedColumnIds.add(valueAccessor);
    tableColumns.forEach((col) => usedColumnIds.add(col));

    // Filter columnMetadata to only include columns used in the visualization
    const filteredColumns = (panel.columnMetadata || []).filter((col) =>
      usedColumnIds.has(col.columnId)
    );

    return {
      type: 'lens',
      grid: {
        x: panel.position.x,
        y: panel.position.y,
        w: panel.position.width,
        h: panel.position.height,
      },
      uid: panelUid,
      config: {
        enhancements: { dynamicActions: { events: [] } },
        syncColors: false,
        syncCursor: true,
        syncTooltips: false,
        filters: [],
        query: { esql: panel.query },
        attributes: {
          title: panel.title,
          references: [],
          state: {
            datasourceStates: {
              textBased: {
                layers: {
                  [layerId]: {
                    index: dataViewId,
                    query: { esql: panel.query },
                    columns: filteredColumns,
                  },
                },
                indexPatternRefs: [
                  {
                    id: dataViewId,
                    title: streamName,
                  },
                ],
              },
            },
            filters: [],
            query: { esql: panel.query },
            visualization,
            adHocDataViews: {
              [dataViewId]: adHocDataView,
            },
          },
          visualizationType,
          version: 1,
          type: 'lens',
        },
      },
    };
  });

  return {
    id: `dashboard-${Date.now()}`,
    contentTypeId: 'dashboard',
    data: {
      version: 1,
      controlGroupInput: {
        autoApplySelections: true,
        chainingSystem: 'HIERARCHICAL',
        ignoreParentSettings: {
          ignoreFilters: false,
          ignoreQuery: false,
          ignoreTimerange: false,
          ignoreValidations: false,
        },
        labelPosition: 'oneLine',
        controls: [],
      },
      description: llmDashboard.description || '',
      filters: [],
      query: { query: '', language: 'kuery' },
      timeRestore: false,
      options: {
        useMargins: true,
        syncColors: false,
        syncCursor: true,
        syncTooltips: false,
        hidePanelTitles: false,
      },
      panels,
      title: llmDashboard.title,
    },
    options: {
      references: [],
      mergeAttributes: false,
    },
    version: 1,
  };
}

type SuggestDashboardResponse = Observable<
  ServerSentEventBase<
    'suggested_dashboard',
    {
      rawDashboard: Awaited<ReturnType<typeof suggestStreamDashboard>>;
      kibanaDashboard: ReturnType<typeof convertToKibanaDashboard>;
    }
  >
>;

export const suggestDashboardRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_suggest_dashboard',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: suggestDashboardSchema,
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<SuggestDashboardResponse> => {
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(STREAMS_TIERED_ML_FEATURE.id);
    if (!isAvailableForTier) {
      throw new SecurityError('Cannot access API on the current pricing tier');
    }

    const { inferenceClient, scopedClusterClient, streamsClient, featureClient } =
      await getScopedClients({
        request,
      });

    const stream = await streamsClient.getStream(params.path.name);

    const features = await featureClient.getFeatures(params.path.name);

    if (!Streams.ingest.all.Definition.is(stream)) {
      throw new Error(`Stream ${stream.name} is not a valid ingest stream`);
    }

    const dashboardPromise = suggestStreamDashboard({
      definition: stream,
      features: features.hits,
      inferenceClient: inferenceClient.bindTo({ connectorId: params.body.connector_id }),
      esClient: scopedClusterClient.asCurrentUser,
      logger,
      maxSteps: 20, // Dashboard creation may require more exploration steps than partitioning
      signal: new AbortController().signal,
    });

    // Turn our promise into an Observable ServerSideEvent. The only reason we're streaming the
    // response here is to avoid timeout issues prevalent with long-running requests to LLMs.
    return from(dashboardPromise).pipe(
      map((rawDashboard) => {
        const kibanaDashboard = convertToKibanaDashboard(rawDashboard, stream.name);
        return {
          rawDashboard,
          kibanaDashboard,
          type: 'suggested_dashboard' as const,
        };
      })
    );
  },
});
