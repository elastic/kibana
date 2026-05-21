/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';
import React, { useCallback, useContext } from 'react';
import { EuiLink } from '@elastic/eui';
import type { NodeProps } from '@xyflow/react';
import { i18n } from '@kbn/i18n';
import {
  INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEIGHT_PX,
  INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX,
} from './ingest_hub_demo_streams_flow_card_layout';
import type { FlowGraphNodeDef } from './ingest_hub_demo_streams_flow_graph_model';
import { FLOW_CONNECTOR_DOT_DASH } from './ingest_hub_demo_streams_flow_connector_paths';
import { polylineToSmoothPathD } from './ingest_hub_demo_streams_flow_graph_highlight';
import { inferFlowCanvasDataProduct } from './ingest_hub_demo_streams_flow_card_badge_row';
import { buildFlowCanvasCardSelection } from './ingest_hub_demo_streams_flow_card_selection';
import { IngestHubDemoStreamsFlowCardClickSlot } from './ingest_hub_demo_streams_flow_card_click_slot';
import { IngestHubDemoStreamsFlowDestinationCard } from './ingest_hub_demo_streams_flow_destination_card';
import { IngestHubDemoStreamsFlowSourceCard } from './ingest_hub_demo_streams_flow_source_card';
import { IngestHubDemoStreamsFlowStepCard } from './ingest_hub_demo_streams_flow_step_card';
import { StreamsPipelineWorldContext } from './ingest_hub_demo_streams_flow_pipeline_world_context';

const CONNECTOR_STROKE_WIDTH = 2.25;
const CONNECTOR_FLOW_CORNER_RADIUS = 18;

const flowCardSlotCss: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  boxSizing: 'border-box',
};

function formatEps(docsPerSec: number): string {
  if (docsPerSec >= 1000) {
    return `${(docsPerSec / 1000).toFixed(1)}k`;
  }
  return String(docsPerSec);
}

function cardSlotStyle(node: FlowGraphNodeDef, dimmed: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: node.x,
    top: node.y,
    width: INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX,
    minWidth: INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX,
    height: INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEIGHT_PX,
    minHeight: INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEIGHT_PX,
    zIndex: 7,
    pointerEvents: 'auto',
    opacity: dimmed ? 0.38 : 1,
    ...flowCardSlotCss,
  };
}

export function StreamsPipelineWorldNode(_props: NodeProps): React.ReactElement | null {
  const ctx = useContext(StreamsPipelineWorldContext);

  const activateNode = useCallback(
    (node: FlowGraphNodeDef) => {
      if (!ctx) {
        return;
      }
      if (node.kind === 'processing') {
        const stepId = node.id.replace(/^processing_\d+_/, '');
        ctx.onCardSelect(
          buildFlowCanvasCardSelection('processing', node.flowIndex, node.id, stepId)
        );
        return;
      }
      ctx.onCardSelect(buildFlowCanvasCardSelection(node.kind, node.flowIndex, node.id));
    },
    [ctx]
  );

  if (!ctx) {
    return null;
  }

  const {
    euiTheme,
    flowLayout,
    topology,
    highlight,
    mergedTracePathD,
    buildStreamHref,
    onStreamNavigate,
    onEdgeHitEnter,
    scheduleHoverClear,
    clearHoverOnCardEnter,
    nodeDimmed,
    connectorPathHoveredClassName,
  } = ctx;

  const destinationForFlow = (flowIndex: number) =>
    topology.destinations.find((dest) => dest.id === topology.sources[flowIndex]?.id) ??
    topology.destinations[flowIndex];

  return (
    <div
      style={{
        position: 'relative',
        width: flowLayout.layoutWidth,
        height: flowLayout.layoutHeight,
      }}
    >
      <svg
        width={flowLayout.layoutWidth}
        height={flowLayout.layoutHeight}
        style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}
        aria-hidden
      >
        {flowLayout.edges.map((edge) => {
          const inFlow = !highlight || highlight.edgeIds.has(edge.id);
          if (highlight && highlight.edgeIds.has(edge.id) && !highlight.multicastBranch) {
            return null;
          }
          const d = polylineToSmoothPathD(edge.polyline, CONNECTOR_FLOW_CORNER_RADIUS);
          if (!d) {
            return null;
          }
          const multicastActive = Boolean(
            highlight?.multicastBranch && highlight.edgeIds.has(edge.id)
          );
          const stroke = multicastActive
            ? euiTheme.colors.borderStrongPrimary
            : euiTheme.colors.borderInteractiveFormsHoverProminent;
          return (
            <path
              key={`vis-${edge.id}`}
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={CONNECTOR_STROKE_WIDTH}
              strokeDasharray={FLOW_CONNECTOR_DOT_DASH}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="nonScalingStroke"
              className={multicastActive ? connectorPathHoveredClassName : undefined}
              opacity={highlight && !inFlow ? 0.42 : 1}
            />
          );
        })}
        {highlight && mergedTracePathD ? (
          <path
            d={mergedTracePathD}
            fill="none"
            stroke={euiTheme.colors.borderStrongPrimary}
            strokeWidth={CONNECTOR_STROKE_WIDTH}
            strokeDasharray={FLOW_CONNECTOR_DOT_DASH}
            strokeLinecap="round"
            className={connectorPathHoveredClassName}
          />
        ) : null}
      </svg>

      <svg
        width={flowLayout.layoutWidth}
        height={flowLayout.layoutHeight}
        style={{ position: 'absolute', inset: 0, zIndex: 2 }}
        aria-hidden
      >
        {flowLayout.edges.map((edge) => {
          const inFlow = !highlight || highlight.edgeIds.has(edge.id);
          return (
            <path
              key={`hit-${edge.id}`}
              d={polylineToSmoothPathD(edge.polyline, CONNECTOR_FLOW_CORNER_RADIUS)}
              fill="none"
              stroke="transparent"
              strokeWidth={28}
              strokeLinecap="round"
              style={{
                pointerEvents: 'stroke',
                opacity: highlight && !inFlow ? 0.45 : 1,
              }}
              onMouseEnter={() => onEdgeHitEnter(edge.id)}
              onMouseLeave={scheduleHoverClear}
            />
          );
        })}
      </svg>

      {flowLayout.nodes.map((node) => {
        const dimmed = nodeDimmed(node.id);
        const flowIndex = node.flowIndex;
        const slotStyle = cardSlotStyle(node, dimmed);
        const activate = () => activateNode(node);

        if (node.kind === 'source') {
          const source = topology.sources[flowIndex];
          if (!source) {
            return null;
          }
          return (
            <IngestHubDemoStreamsFlowCardClickSlot
              key={node.id}
              nodeId={node.id}
              ariaLabel={i18n.translate('xpack.streams.ingestHubFlowCanvas.openSourceDetails', {
                defaultMessage: 'View details for source {name}',
                values: { name: source.title },
              })}
              style={slotStyle}
              onActivate={activate}
              onMouseEnter={clearHoverOnCardEnter}
            >
              <IngestHubDemoStreamsFlowSourceCard
                title={source.title}
                logoUrl={source.logoUrl}
                metricsLine={i18n.translate('xpack.streams.ingestHubFlowCanvas.sourceMetrics', {
                  defaultMessage: '{eps} eps · 180ms',
                  values: { eps: formatEps(source.docsPerSec) },
                })}
                quality="good"
                dataProduct={inferFlowCanvasDataProduct(
                  destinationForFlow(flowIndex)?.name ?? source.id
                )}
                dimmed={false}
              />
            </IngestHubDemoStreamsFlowCardClickSlot>
          );
        }

        if (node.kind === 'processing') {
          const stepId = node.id.replace(/^processing_\d+_/, '');
          const step = topology.processingSteps.find((s) => s.id === stepId);
          if (!step) {
            return null;
          }
          return (
            <IngestHubDemoStreamsFlowCardClickSlot
              key={node.id}
              nodeId={node.id}
              ariaLabel={i18n.translate('xpack.streams.ingestHubFlowCanvas.openPipelineDetails', {
                defaultMessage: 'View details for pipeline step {name}',
                values: { name: step.label },
              })}
              style={slotStyle}
              onActivate={activate}
              onMouseEnter={clearHoverOnCardEnter}
            >
              <IngestHubDemoStreamsFlowStepCard
                kind="processing"
                label={step.label}
                detailLine={step.streamlangSummary}
                dimmed={false}
              />
            </IngestHubDemoStreamsFlowCardClickSlot>
          );
        }

        if (node.kind === 'routing') {
          const source = topology.sources[flowIndex];
          const dest = destinationForFlow(flowIndex);
          if (!source || !dest) {
            return null;
          }
          const routingTitle = i18n.translate(
            'xpack.streams.ingestHubFlowCanvas.routeToDestination',
            {
              defaultMessage: 'Route to destination',
            }
          );
          return (
            <IngestHubDemoStreamsFlowCardClickSlot
              key={node.id}
              nodeId={node.id}
              ariaLabel={i18n.translate('xpack.streams.ingestHubFlowCanvas.openRoutingDetails', {
                defaultMessage: 'View routing details for {source}',
                values: { source: source.title },
              })}
              style={slotStyle}
              onActivate={activate}
              onMouseEnter={clearHoverOnCardEnter}
            >
              <IngestHubDemoStreamsFlowStepCard
                kind="routing"
                label={routingTitle}
                detailLine={`event.dataset == aws.${source.id}`}
                dimmed={false}
              />
            </IngestHubDemoStreamsFlowCardClickSlot>
          );
        }

        if (node.kind === 'stream') {
          const dest = destinationForFlow(flowIndex);
          if (!dest) {
            return null;
          }
          const titleNode = (
            <EuiLink
              href={buildStreamHref(dest.name)}
              data-test-subj={`streamsFlowCanvasStreamLink-${dest.name}`}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();
                onStreamNavigate(dest.name);
              }}
            >
              {dest.name}
            </EuiLink>
          );
          return (
            <IngestHubDemoStreamsFlowCardClickSlot
              key={node.id}
              nodeId={node.id}
              ariaLabel={i18n.translate(
                'xpack.streams.ingestHubFlowCanvas.openDestinationDetails',
                {
                  defaultMessage: 'View details for destination stream {name}',
                  values: { name: dest.name },
                }
              )}
              style={slotStyle}
              onActivate={activate}
              onMouseEnter={clearHoverOnCardEnter}
            >
              <IngestHubDemoStreamsFlowDestinationCard
                title={titleNode}
                titleTooltip={dest.name}
                metricsLine={i18n.translate(
                  'xpack.streams.ingestHubFlowCanvas.streamMetricsFromRow',
                  {
                    defaultMessage: '{retention}d · {eps} eps · 180ms',
                    values: { retention: 30, eps: formatEps(dest.docsPerSec) },
                  }
                )}
                quality={dest.quality}
                dataProduct={inferFlowCanvasDataProduct(dest.name)}
                dimmed={false}
              />
            </IngestHubDemoStreamsFlowCardClickSlot>
          );
        }

        return null;
      })}
    </div>
  );
}
