/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WiredStream, ClassicStream } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import type { StreamDocsStat } from '../../../../common';
import type {
  FlowEdge,
  FlowGraphPayload,
  FlowNode,
  FlowThroughputPayload,
} from '../../../../common/flow/types';
import type {
  OtlpEndpointConfig,
  PipelineMetricsResult,
} from '../../mock_ingest_sources/cloud_pipelines/types';
import type {
  PrometheusScraper,
  ScraperMetricsResult,
} from '../../mock_ingest_sources/prometheus/types';

// ── Fleet types (minimal shape, avoids tight coupling to fleet internals) ─────

interface FleetAgent {
  id: string;
  policy_id?: string | null;
  status?: string;
  local_metadata: Record<string, unknown>;
  agent?: { id?: string; version?: string };
}

interface FleetAgentPolicyPackagePolicy {
  id: string;
  name: string;
  package?: { name?: string; title?: string };
  policy_id?: string | null;
  policy_ids?: string[];
}

interface FleetAgentPolicy {
  id: string;
  name: string;
  supports_agentless?: boolean | null;
  agents?: number;
  package_policies?: FleetAgentPolicyPackagePolicy[];
}

// ── Input shape ───────────────────────────────────────────────────────────────

export interface AssembleFlowGraphInputs {
  streams: Array<{ stream: Streams.all.Definition; exists: boolean }>;
  streamDocCounts: StreamDocsStat[];
  streamFailedCounts: StreamDocsStat[];
  windowSeconds: number;
  agents: FleetAgent[];
  agentPolicies: FleetAgentPolicy[];
  cloudPipelines: OtlpEndpointConfig[];
  cloudPipelineMetrics: PipelineMetricsResult;
  prometheusScrapers: PrometheusScraper[];
  prometheusMetrics: ScraperMetricsResult;
  fleetAvailable: boolean;
  now: number;
}

// ── Helper: build a map from stream name → doc count ─────────────────────────

const buildCountMap = (stats: StreamDocsStat[]): Map<string, number> => {
  const map = new Map<string, number>();
  for (const { stream, count } of stats) {
    map.set(stream, count);
  }
  return map;
};

// ── Main assembler ────────────────────────────────────────────────────────────

export const assembleFlowGraphPayload = (inputs: AssembleFlowGraphInputs): FlowGraphPayload => {
  const {
    streams,
    streamDocCounts,
    streamFailedCounts,
    windowSeconds,
    agents,
    agentPolicies,
    cloudPipelines,
    cloudPipelineMetrics,
    prometheusScrapers,
    prometheusMetrics,
    fleetAvailable,
    now,
  } = inputs;

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  const docCountMap = buildCountMap(streamDocCounts);
  const failedCountMap = buildCountMap(streamFailedCounts);

  const BULK_ENDPOINT_ID = 'bulk-endpoint';

  // ── Separate agentless policies from regular ones ─────────────────────────
  const agentlessPolicies = agentPolicies.filter((p) => p.supports_agentless === true);
  const regularPolicies = agentPolicies.filter((p) => !p.supports_agentless);

  // ── Build policy group nodes + agent nodes ────────────────────────────────
  for (const policy of regularPolicies) {
    const policyNodeId = `agent-policy-${policy.id}`;
    const policyAgents = agents.filter((a) => a.policy_id === policy.id);

    nodes.push({
      kind: 'agentPolicy',
      id: policyNodeId,
      label: policy.name,
      column: 'shippers',
      lane: 'agents',
      policyId: policy.id,
      agentCount: policy.agents ?? policyAgents.length,
    });

    for (const agent of policyAgents) {
      const localMeta = agent.local_metadata;
      const hostMeta = localMeta.host as Record<string, unknown> | undefined;
      const elasticMeta = localMeta.elastic as Record<string, unknown> | undefined;
      const agentMeta = elasticMeta?.agent as Record<string, unknown> | undefined;

      const hostname =
        (hostMeta?.hostname as string | undefined) ??
        (agent.agent?.id as string | undefined) ??
        agent.id;
      const version =
        (agentMeta?.version as string | undefined) ??
        (agent.agent?.version as string | undefined) ??
        'unknown';
      const agentStatus = agent.status ?? 'unknown';

      nodes.push({
        kind: 'agent',
        id: `agent-${agent.id}`,
        label: hostname,
        column: 'shippers',
        lane: 'agents',
        parentId: policyNodeId,
        agentId: agent.id,
        policyId: policy.id,
        hostname,
        version,
        agentStatus,
        health: { status: mapAgentStatusToHealth(agentStatus) },
      });
    }
  }

  // ── Agentless integration nodes ───────────────────────────────────────────
  for (const policy of agentlessPolicies) {
    const pkgPolicies = policy.package_policies ?? [];
    for (const pkgPolicy of pkgPolicies) {
      const nodeId = `agentless-${pkgPolicy.id}`;
      nodes.push({
        kind: 'agentlessIntegration',
        id: nodeId,
        label: pkgPolicy.package?.title ?? pkgPolicy.name,
        column: 'shippers',
        lane: 'agentless',
        packagePolicyId: pkgPolicy.id,
        packageName: pkgPolicy.package?.name ?? '',
        packageTitle: pkgPolicy.package?.title ?? pkgPolicy.name,
        autoPolicyId: policy.id,
      });
    }
  }

  // ── Root wired streams — used to assign fallback pipeline targets ─────────
  // Computed after stream nodes are built (streamNodeIdByName is populated below),
  // so we collect the raw info here and resolve the map reference after the stream loop.
  // (Populated further down, after the stream-node loop.)
  const rootWiredStreamNames: string[] = [];

  // ── Cloud pipeline nodes (throughput filled in after stream nodes are built) ─
  // Stored for patching below.
  const cloudPipelineNodeIds = new Map<string, string>(); // pipeline.id → nodeId

  // ── Bulk endpoint node ────────────────────────────────────────────────────
  nodes.push({
    kind: 'bulkEndpoint',
    id: BULK_ENDPOINT_ID,
    label: 'ES Bulk',
    column: 'endpoints',
    lane: 'bulk',
  });

  // ── Prometheus scraper nodes ──────────────────────────────────────────────
  for (const scraper of prometheusScrapers) {
    const scraperNodeId = `prom-scraper-${scraper.id}`;
    const scraperThroughput = prometheusMetrics.perScraper[scraper.id];
    const scraperHealth = prometheusMetrics.health[scraper.id];

    nodes.push({
      kind: 'prometheusScraper',
      id: scraperNodeId,
      label: scraper.name,
      column: 'shippers',
      lane: 'prometheus',
      scraperId: scraper.id,
      targetHost: scraper.targetHost,
      scrapeIntervalSec: scraper.scrapeIntervalSec,
      throughput: scraperThroughput
        ? { docsPerSec: scraperThroughput.docsPerSec, bytesPerSec: scraperThroughput.bytesPerSec }
        : undefined,
      health: scraperHealth
        ? { status: scraperHealth.status, message: scraperHealth.message }
        : undefined,
    });
  }

  // ── Stream nodes ──────────────────────────────────────────────────────────
  const streamNodeIdByName = new Map<string, string>();
  const streamDocsPerSecByName = new Map<string, number>();

  for (const { stream } of streams) {
    const streamNodeId = `stream-${stream.name}`;
    streamNodeIdByName.set(stream.name, streamNodeId);

    const rawDocCount = docCountMap.get(stream.name) ?? 0;
    const rawFailedCount = failedCountMap.get(stream.name) ?? 0;
    const docsPerSec = windowSeconds > 0 ? rawDocCount / windowSeconds : 0;
    const failedDocsPerSec = windowSeconds > 0 ? rawFailedCount / windowSeconds : 0;

    streamDocsPerSecByName.set(stream.name, docsPerSec);

    if (WiredStream.Definition.is(stream)) {
      const parentName = getParentStreamName(stream.name);
      const parentId = parentName ? `stream-${parentName}` : undefined;

      // Track root wired streams for cloud pipeline fallback targeting
      if (!parentName) {
        rootWiredStreamNames.push(stream.name);
      }

      nodes.push({
        kind: 'wiredStream',
        id: streamNodeId,
        label: stream.name,
        column: 'streams',
        lane: 'streams',
        parentId,
        streamName: stream.name,
        processingStepCount: stream.ingest.processing.steps?.length ?? 0,
        routingRuleCount: stream.ingest.wired.routing.length,
        throughput: { docsPerSec },
        failureRate:
          rawFailedCount > 0 ? { docsPerSec: failedDocsPerSec, lastSeenAt: now } : undefined,
      });
    } else if (ClassicStream.Definition.is(stream)) {
      nodes.push({
        kind: 'classicStream',
        id: streamNodeId,
        label: stream.name,
        column: 'streams',
        lane: 'streams',
        streamName: stream.name,
        dataStream: stream.name,
        throughput: { docsPerSec },
        failureRate:
          rawFailedCount > 0 ? { docsPerSec: failedDocsPerSec, lastSeenAt: now } : undefined,
      });
    }
  }

  // ── Cloud pipeline nodes — built after streams so we can use real throughput ─
  // Resolve target for each pipeline: use configured targetStreamName if it
  // exists in the real stream set, otherwise fall back round-robin to root wired
  // streams.  This makes fake metrics match actual ingest numbers.
  const resolvedPipelineTargets = cloudPipelines.map((pipeline, idx) => {
    const configured = pipeline.targetStreamName && streamNodeIdByName.has(pipeline.targetStreamName)
      ? pipeline.targetStreamName
      : undefined;
    const fallback = rootWiredStreamNames.length > 0
      ? rootWiredStreamNames[idx % rootWiredStreamNames.length]
      : undefined;
    return { pipeline, targetStreamName: configured ?? fallback };
  });

  for (const { pipeline, targetStreamName } of resolvedPipelineTargets) {
    const pipelineNodeId = `cloud-pipeline-${pipeline.id}`;
    cloudPipelineNodeIds.set(pipeline.id, pipelineNodeId);
    const pipelineHealth = cloudPipelineMetrics.health[pipeline.id];

    // Use the real target stream's throughput so numbers add up across the graph
    const realDocsPerSec = targetStreamName ? streamDocsPerSecByName.get(targetStreamName) : undefined;

    nodes.push({
      kind: 'cloudPipeline',
      id: pipelineNodeId,
      label: pipeline.name,
      column: 'endpoints',
      lane: 'pipelines',
      pipelineId: pipeline.id,
      targetStreamName,
      throughput: realDocsPerSec !== undefined ? { docsPerSec: realDocsPerSec } : undefined,
      health: pipelineHealth
        ? { status: pipelineHealth.status, message: pipelineHealth.message }
        : undefined,
    });
  }

  // ── Wired stream → stream edges (routing rules) ───────────────────────────
  for (const { stream } of streams) {
    if (!WiredStream.Definition.is(stream)) continue;

    const sourceNodeId = streamNodeIdByName.get(stream.name);
    if (!sourceNodeId) continue;

    for (const rule of stream.ingest.wired.routing) {
      const targetNodeId = streamNodeIdByName.get(rule.destination);
      if (!targetNodeId) continue;

      edges.push({
        id: `stream-edge-${stream.name}->${rule.destination}`,
        source: sourceNodeId,
        target: targetNodeId,
        kind: 'stream->stream',
        routingRuleId: rule.destination,
      });
    }
  }

  // ── Cloud pipeline → stream edges ────────────────────────────────────────
  for (const { pipeline, targetStreamName } of resolvedPipelineTargets) {
    const pipelineNodeId = `cloud-pipeline-${pipeline.id}`;
    if (targetStreamName) {
      const targetStreamNodeId = streamNodeIdByName.get(targetStreamName);
      if (targetStreamNodeId) {
        const realDocsPerSec = streamDocsPerSecByName.get(targetStreamName);
        edges.push({
          id: `pipeline-stream-edge-${pipeline.id}->${targetStreamName}`,
          source: pipelineNodeId,
          target: targetStreamNodeId,
          kind: 'pipeline->stream',
          isMock: true,
          throughput: realDocsPerSec !== undefined ? { docsPerSec: realDocsPerSec } : undefined,
        });
      }
    }
  }

  // ── Bulk endpoint → stream edges (classic streams go via bulk) ────────────
  for (const { stream } of streams) {
    if (!ClassicStream.Definition.is(stream)) continue;
    const streamNodeId = streamNodeIdByName.get(stream.name);
    if (!streamNodeId) continue;

    edges.push({
      id: `bulk-stream-edge-${stream.name}`,
      source: BULK_ENDPOINT_ID,
      target: streamNodeId,
      kind: 'bulk->stream',
    });
  }

  // ── Agent policy → bulk endpoint + cloud pipeline edges ──────────────────
  // Approximation: all fleet agents → bulk endpoint + all cloud pipelines (spec §9)
  for (const policy of regularPolicies) {
    const policyNodeId = `agent-policy-${policy.id}`;

    edges.push({
      id: `agent-policy-edge-${policy.id}->bulk`,
      source: policyNodeId,
      target: BULK_ENDPOINT_ID,
      kind: 'agent->endpoint',
    });

    for (const { pipeline } of resolvedPipelineTargets) {
      const pipelineNodeId = `cloud-pipeline-${pipeline.id}`;
      edges.push({
        id: `agent-policy-edge-${policy.id}->${pipeline.id}`,
        source: policyNodeId,
        target: pipelineNodeId,
        kind: 'agent->pipeline',
        isMock: true,
      });
    }
  }

  // ── Agentless → bulk endpoint edges ──────────────────────────────────────
  for (const policy of agentlessPolicies) {
    const pkgPolicies = policy.package_policies ?? [];
    for (const pkgPolicy of pkgPolicies) {
      const nodeId = `agentless-${pkgPolicy.id}`;
      edges.push({
        id: `agentless-edge-${pkgPolicy.id}->bulk`,
        source: nodeId,
        target: BULK_ENDPOINT_ID,
        kind: 'agentless->endpoint',
      });
    }
  }

  // ── Prometheus scraper edges ──────────────────────────────────────────────
  for (const scraper of prometheusScrapers) {
    const scraperNodeId = `prom-scraper-${scraper.id}`;

    if (
      scraper.destination.kind === 'cloudPipeline' &&
      cloudPipelineNodeIds.has(scraper.destination.pipelineId)
    ) {
      const pipelineNodeId = `cloud-pipeline-${scraper.destination.pipelineId}`;
      edges.push({
        id: `prom-edge-${scraper.id}->${scraper.destination.pipelineId}`,
        source: scraperNodeId,
        target: pipelineNodeId,
        kind: 'prometheus->pipeline',
        isMock: true,
      });
    } else {
      edges.push({
        id: `prom-edge-${scraper.id}->bulk`,
        source: scraperNodeId,
        target: BULK_ENDPOINT_ID,
        kind: 'prometheus->endpoint',
        isMock: true,
      });
    }
  }

  return {
    nodes,
    edges,
    meta: {
      generatedAt: now,
      fleetAvailable,
      cloudPipelinesMock: true,
      prometheusMock: true,
      timeWindow: {
        start: now - windowSeconds * 1000,
        end: now,
      },
    },
  };
};

// ── Throughput payload assembler ──────────────────────────────────────────────

export const assembleFlowThroughputPayload = (
  inputs: Pick<
    AssembleFlowGraphInputs,
    | 'streams'
    | 'streamDocCounts'
    | 'streamFailedCounts'
    | 'windowSeconds'
    | 'cloudPipelines'
    | 'cloudPipelineMetrics'
    | 'prometheusScrapers'
    | 'prometheusMetrics'
    | 'now'
  >
): FlowThroughputPayload => {
  const {
    streams,
    streamDocCounts,
    streamFailedCounts,
    windowSeconds,
    cloudPipelines,
    cloudPipelineMetrics,
    prometheusScrapers,
    prometheusMetrics,
    now,
  } = inputs;

  const docCountMap = buildCountMap(streamDocCounts);
  const failedCountMap = buildCountMap(streamFailedCounts);

  const perNode: FlowThroughputPayload['perNode'] = {};
  const perNodeFailureRate: FlowThroughputPayload['perNodeFailureRate'] = {};
  const perNodeHealth: FlowThroughputPayload['perNodeHealth'] = {};
  const perEdge: FlowThroughputPayload['perEdge'] = {};

  // Stream nodes
  for (const { stream } of streams) {
    const nodeId = `stream-${stream.name}`;
    const rawDocCount = docCountMap.get(stream.name) ?? 0;
    const rawFailedCount = failedCountMap.get(stream.name) ?? 0;
    const docsPerSec = windowSeconds > 0 ? rawDocCount / windowSeconds : 0;
    const failedDocsPerSec = windowSeconds > 0 ? rawFailedCount / windowSeconds : 0;

    perNode[nodeId] = { docsPerSec };
    if (rawFailedCount > 0) {
      perNodeFailureRate[nodeId] = { docsPerSec: failedDocsPerSec, lastSeenAt: now };
      perNodeHealth[nodeId] = { status: 'degraded' };
    } else {
      perNodeHealth[nodeId] = { status: 'healthy' };
    }
  }

  // Cloud pipeline nodes
  for (const pipeline of cloudPipelines) {
    const nodeId = `cloud-pipeline-${pipeline.id}`;
    const throughput = cloudPipelineMetrics.perPipeline[pipeline.id];
    const health = cloudPipelineMetrics.health[pipeline.id];
    if (throughput) {
      perNode[nodeId] = { docsPerSec: throughput.docsPerSec, bytesPerSec: throughput.bytesPerSec };
    }
    if (health) {
      perNodeHealth[nodeId] = { status: health.status, message: health.message };
    }
    // Edge throughput
    if (pipeline.targetStreamName) {
      const edgeKey = `${pipeline.id}->${pipeline.targetStreamName}`;
      const edgeThroughput = cloudPipelineMetrics.perEdge[edgeKey];
      if (edgeThroughput) {
        perEdge[`pipeline-stream-edge-${pipeline.id}->${pipeline.targetStreamName}`] = {
          docsPerSec: edgeThroughput.docsPerSec,
        };
      }
    }
  }

  // Prometheus scraper nodes
  for (const scraper of prometheusScrapers) {
    const nodeId = `prom-scraper-${scraper.id}`;
    const throughput = prometheusMetrics.perScraper[scraper.id];
    const health = prometheusMetrics.health[scraper.id];
    if (throughput) {
      perNode[nodeId] = { docsPerSec: throughput.docsPerSec, bytesPerSec: throughput.bytesPerSec };
    }
    if (health) {
      perNodeHealth[nodeId] = { status: health.status, message: health.message };
    }
  }

  return {
    perNode,
    perNodeFailureRate,
    perNodeHealth,
    perEdge,
    generatedAt: now,
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the parent stream name for a dotted name, e.g. "logs.app" → "logs" */
const getParentStreamName = (name: string): string | undefined => {
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.slice(0, lastDot) : undefined;
};

const mapAgentStatusToHealth = (
  agentStatus: string
): 'healthy' | 'degraded' | 'down' | 'unknown' => {
  switch (agentStatus) {
    case 'online':
    case 'active':
      return 'healthy';
    case 'degraded':
    case 'updating':
    case 'enrolling':
      return 'degraded';
    case 'offline':
    case 'error':
    case 'inactive':
    case 'unenrolled':
    case 'disconnected':
      return 'down';
    default:
      return 'unknown';
  }
};
