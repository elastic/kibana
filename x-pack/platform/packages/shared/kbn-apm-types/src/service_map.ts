/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AlertStatus } from '@kbn/rule-data-utils';
import type { Edge, Node, EdgeMarker as ReactFlowEdgeMarker } from '@xyflow/react';
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
  /** Absent when grouping is off, the map has fewer than 100 services, or grouping failed. */
  serviceGrouping?: ServiceMapGrouping;
}

/** What a service map grouping strategy groups services by. */
export type ServiceGroupingSource =
  | 'serviceGroups'
  | 'service.namespace'
  | 'kubernetes.namespace'
  | 'namePrefix'
  | 'calls';

/** A saved service group the service matches. */
export interface ServiceGroupMapGroup {
  id: string;
  kind: 'savedGroup';
  name: string;
}

/** Services sharing the value of an attribute. */
export interface AttributeServiceMapGroup {
  id: string;
  kind: 'attribute';
  attribute: Exclude<ServiceGroupingSource, 'serviceGroups' | 'calls'>;
  value: string;
}

/** Services that call each other a lot, named after the busiest of them. */
export interface CallsServiceMapGroup {
  id: string;
  kind: 'calls';
  busiestService: string;
}

/** Services called by a large share of the estate, or connected to far more services than most. */
export interface SharedServiceMapGroup {
  id: string;
  kind: 'shared';
}

/** Services with no calls, or in a small piece of the call graph cut off from the rest. */
export interface NotConnectedServiceMapGroup {
  id: string;
  kind: 'notConnected';
}

export type ServiceMapGroup =
  | ServiceGroupMapGroup
  | AttributeServiceMapGroup
  | CallsServiceMapGroup
  | SharedServiceMapGroup
  | NotConnectedServiceMapGroup;

/** One way of grouping the map's services. */
export interface ServiceGroupingStrategy {
  source: ServiceGroupingSource;
  /** Whether this grouping passed the readability checks. */
  passes: boolean;
  /** This strategy's own groups. The same id can hold different services in another strategy. */
  groups: ServiceMapGroup[];
  /** `assignment[i]` is the index in `groups` of `services[i]`. */
  assignment: number[];
}

/** Every grouping the map can show, and the one shown automatically. */
export interface ServiceMapGrouping {
  /** Every service on the map, sorted. */
  services: string[];
  /** The strategy shown automatically. Always one of `strategies`. */
  automatic: ServiceGroupingSource;
  strategies: ServiceGroupingStrategy[];
}

export type ServiceMapResponse = Pick<ServiceMapTelemetry, 'tracesCount'> & ServiceMapRawResponse;

/** Stats of a service's main transaction type. */
export interface ServiceMapServiceStats {
  transactionType: string;
  throughput: number;
  /** `null` when none of the main type's transactions has a known outcome */
  failedTransactionRate: number | null;
  /** In microseconds */
  latency: number | null;
  requestCount: number;
}

export interface ServicesResponse {
  [SERVICE_NAME]: string;
  [AGENT_NAME]: string;
  [SERVICE_ENVIRONMENT]: string | null;
  /** Only set when service map grouping is enabled and the service has transactions */
  stats?: ServiceMapServiceStats;
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
  /** Only set when service map grouping is enabled and the service has transactions */
  stats?: ServiceMapServiceStats;
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
  /** The resources behind a grouped edge (edge to a "N resources" node). */
  groupedConnections?: GroupedConnectionInfo[];
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
