/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from './es_fields/apm';
import type { Coordinate } from './coordinate';
import type { SloStatus } from './service_inventory';
import type { ServiceAnomaliesResponse } from './service_anomalies';
import type { ServiceAnomalyStats } from './service_anomaly_stats';
import type { AgentName } from './es_schemas/ui/fields/agent';
import type { AlertStatus } from '@kbn/rule-data-utils';
import type { Edge, Node, EdgeMarker as ReactFlowEdgeMarker } from '@xyflow/react';

export interface ServiceMapTelemetry {
  tracesCount: number;
  nodesCount: number;
}

export type GroupedConnection = { label: string } & (ConnectionNode | ConnectionEdge);

export interface GroupedNode {
  data: {
    id: string;
    'span.type': string;
    'span.subtype'?: string;
    label: string;
    groupedConnections: GroupedConnection[];
  };
}

export interface GroupedEdge {
  data: {
    id: string;
    source: string;
    target: string;
  };
}

export interface GroupResourceNodesResponse extends Pick<ServiceMapTelemetry, 'nodesCount'> {
  elements: Array<GroupedNode | GroupedEdge | ConnectionElement>;
}

export type ConnectionType = Connection | ConnectionLegacy;
export type DestinationType = ExitSpanDestination | ExitSpanDestinationLegacy;

export interface ServiceMapRawResponse {
  spans: ServiceMapSpan[];
  servicesData: ServicesResponse[];
  anomalies: ServiceAnomaliesResponse;
}

export type ServiceMapResponse = Pick<ServiceMapTelemetry, 'tracesCount'> & ServiceMapRawResponse;

export interface ServicesResponse {
  [SERVICE_NAME]: string;
  [AGENT_NAME]: string;
  [SERVICE_ENVIRONMENT]: string | null;
}

export interface ServiceConnectionNode extends ServicesResponse {
  id: string;
  serviceAnomalyStats?: ServiceAnomalyStats;
  label?: string;
}

export interface ExternalConnectionNode {
  id: string;
  [SPAN_DESTINATION_SERVICE_RESOURCE]: string;
  [SPAN_TYPE]: string;
  [SPAN_SUBTYPE]: string;
  label?: string;
}

export type ConnectionNode = ServiceConnectionNode | ExternalConnectionNode;
export type ConnectionNodeLegacy =
  | Omit<ServiceConnectionNode, 'id'>
  | Omit<ExternalConnectionNode, 'id'>;

export interface ConnectionEdge {
  id: string;
  source: ConnectionNode['id'];
  target: ConnectionNode['id'];
  label?: string;
  bidirectional?: boolean;
  isInverseEdge?: boolean;
  resources?: string[];
  sourceData?: ConnectionNode;
  targetData?: ConnectionNode;
  sourceLabel?: string;
  targetLabel?: string;
}

export type NodeItem = {
  id: string;
} & ConnectionNode;

export interface ConnectionElement {
  data: ConnectionNode | ConnectionEdge;
}

export interface Connection {
  source: ConnectionNode;
  destination: ConnectionNode;
}

export interface ConnectionLegacy {
  source: ConnectionNodeLegacy;
  destination: ConnectionNodeLegacy;
}

export interface NodeStats {
  transactionStats?: {
    latency?: {
      value: number | null;
      timeseries?: Coordinate[];
    };
    throughput?: {
      value: number | null;
      timeseries?: Coordinate[];
    };
  };
  failedTransactionsRate?: {
    value: number | null;
    timeseries?: Coordinate[];
  };
  cpuUsage?: {
    value?: number | null;
    timeseries?: Coordinate[];
  };
  memoryUsage?: {
    value?: number | null;
    timeseries?: Coordinate[];
  };
}

export interface ExitSpanDestination {
  from: ExternalConnectionNode;
  to: ServiceConnectionNode;
}

export interface ExitSpanDestinationLegacy {
  from: Omit<ExternalConnectionNode, 'id'>;
  to: Omit<ServiceConnectionNode, 'id'>;
}

export interface ServiceMapService {
  serviceName: string;
  agentName: AgentName;
  serviceEnvironment?: string;
  serviceNodeName?: string;
}

export interface ServiceMapExitSpan extends ServiceMapService {
  spanId: string;
  spanType: string;
  spanSubtype: string;
  spanDestinationServiceResource: string;
}

export type ServiceMapSpan = ServiceMapExitSpan & {
  destinationService?: ServiceMapService;
};

interface BaseNodeData extends Record<string, unknown> {
  id: string;
  label: string;
}

export interface ServiceNodeData extends BaseNodeData {
  isService: true;
  contextHighlight?: boolean;
  agentName?: AgentName;
  serviceAnomalyStats?: ServiceAnomalyStats;
  alertsCount?: number;
  alertsByStatus?: Partial<Record<AlertStatus, number>>;
  sloStatus?: SloStatus | 'noSLOs';
  sloCount?: number;
}

export interface DependencyNodeData extends BaseNodeData {
  isService: false;
  spanType?: string;
  spanSubtype?: string;
  [SPAN_TYPE]?: string;
  [SPAN_SUBTYPE]?: string;
}

export interface GroupedConnectionInfo {
  id: string;
  label: string;
  spanType?: string;
  spanSubtype?: string;
  [SPAN_TYPE]?: string;
  [SPAN_SUBTYPE]?: string;
  [SPAN_DESTINATION_SERVICE_RESOURCE]?: string;
}

export interface GroupInfo {
  id: string;
  sources: string[];
  targets: string[];
}

export interface GroupedNodeData extends BaseNodeData {
  isService: false;
  isGrouped: true;
  spanType?: string;
  spanSubtype?: string;
  groupedConnections: GroupedConnectionInfo[];
  count: number;
}

export type ServiceMapNodeData = ServiceNodeData | DependencyNodeData | GroupedNodeData;

export type ServiceMapNode = Node<ServiceMapNodeData>;

export interface EdgeMarker extends ReactFlowEdgeMarker {
  width: number;
  height: number;
  color: string;
}

export interface ServiceMapEdgeData extends Record<string, unknown> {
  isBidirectional: boolean;
  isGrouped?: boolean;
  sourceData?: ConnectionNode;
  targetData?: ConnectionNode;
  sourceLabel?: string;
  targetLabel?: string;
  resources?: string[];
}

export interface ServiceMapEdge extends Edge<ServiceMapEdgeData> {
  type: 'default';
  style: {
    stroke: string;
    strokeWidth: number;
  };
  markerEnd: EdgeMarker;
  markerStart?: EdgeMarker;
}

export interface GroupResourceNodesResult {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  nodesCount: number;
}

export interface ReactFlowServiceMapResponse {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  nodesCount: number;
  tracesCount: number;
}
