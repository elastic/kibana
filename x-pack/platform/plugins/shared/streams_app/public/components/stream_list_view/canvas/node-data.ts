/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Factory functions for the data carried by freshly-created nodes, plus
// createNode for palette/drag placement.

import type { Node, XYPosition } from '@xyflow/react';
import { i18n } from '@kbn/i18n';
import type { CanvasNodeType } from './constants';
import type {
  DestinationNodeData,
  PipelineNodeData,
  RoutingNodeData,
  SourceNodeData,
} from './types';

export function sourceData(): SourceNodeData {
  return {
    title: i18n.translate('xpack.streams.streamsCanvas.sourceTitle', {
      defaultMessage: 'AWS CloudWatch',
    }),
    subtitle: i18n.translate('xpack.streams.streamsCanvas.sourceSubtitle', {
      defaultMessage: 'Logs · Push via Firehose',
    }),
    rate: '11.9k/s',
  };
}

export const DEFAULT_DESTINATION_TITLE = i18n.translate(
  'xpack.streams.streamsCanvas.destinationTitle',
  { defaultMessage: 'Destination name' }
);

export const NEW_DESTINATION_TITLE = i18n.translate(
  'xpack.streams.streamsCanvas.newDestinationTitle',
  { defaultMessage: 'New destination' }
);

export function configuredDestinationData(title?: string): DestinationNodeData {
  return {
    title: title?.trim() || DEFAULT_DESTINATION_TITLE,
    mode: 'configured',
    meta: '8.1k eps・175ms',
    status: i18n.translate('xpack.streams.streamsCanvas.destinationStatus', {
      defaultMessage: 'Good',
    }),
  };
}

export function unconfiguredDestinationData(): DestinationNodeData {
  return {
    title: NEW_DESTINATION_TITLE,
    mode: 'unconfigured',
  };
}

export function pipelineData(): PipelineNodeData {
  return {
    title: i18n.translate('xpack.streams.streamsCanvas.pipelineNodeName', {
      defaultMessage: 'MyPipelineName',
    }),
    eps: '3.8k eps',
    latency: '190ms',
  };
}

export function routingData(): RoutingNodeData {
  return {};
}

export function defaultDataFor(type: CanvasNodeType): SourceNodeData | DestinationNodeData {
  return type === 'source' ? sourceData() : configuredDestinationData();
}

let nodeIdCounter = 0;
export function createNode(type: CanvasNodeType, position: XYPosition): Node {
  nodeIdCounter += 1;
  // Newly added destinations start unconfigured until the user sets them up.
  const data = type === 'source' ? sourceData() : unconfiguredDestinationData();
  return {
    id: `${type}-${Date.now()}-${nodeIdCounter}`,
    type,
    position,
    data,
  };
}
