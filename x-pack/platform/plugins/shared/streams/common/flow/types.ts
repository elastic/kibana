/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

// ── Shared atoms ─────────────────────────────────────────────────────────────

export const flowHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'down', 'unknown']),
  message: z.string().optional(),
});

export type FlowHealth = z.infer<typeof flowHealthSchema>;

export const flowThroughputSchema = z.object({
  docsPerSec: z.number().nonnegative(),
  bytesPerSec: z.number().nonnegative().optional(),
});

export type FlowThroughput = z.infer<typeof flowThroughputSchema>;

export const flowFailureRateSchema = z.object({
  docsPerSec: z.number().nonnegative(),
  lastSeenAt: z.number().int().optional(), // epoch ms
});

export type FlowFailureRate = z.infer<typeof flowFailureRateSchema>;

// ── Node discriminated union ─────────────────────────────────────────────────

const flowNodeBase = z.object({
  id: z.string(),
  label: z.string(),
  column: z.enum(['shippers', 'endpoints', 'streams']),
  lane: z.enum(['agents', 'agentless', 'prometheus', 'pipelines', 'bulk', 'streams']),
  parentId: z.string().optional(),
  health: flowHealthSchema.optional(),
  throughput: flowThroughputSchema.optional(),
});

export const flowNodeSchema = z.discriminatedUnion('kind', [
  flowNodeBase.extend({
    kind: z.literal('agent'),
    agentId: z.string(),
    policyId: z.string(),
    hostname: z.string(),
    version: z.string(),
    agentStatus: z.string(),
  }),
  flowNodeBase.extend({
    kind: z.literal('agentPolicy'),
    policyId: z.string(),
    agentCount: z.number().int(),
  }),
  flowNodeBase.extend({
    kind: z.literal('agentlessIntegration'),
    packagePolicyId: z.string(),
    packageName: z.string(),
    packageTitle: z.string(),
    autoPolicyId: z.string(),
  }),
  flowNodeBase.extend({
    kind: z.literal('prometheusScraper'),
    scraperId: z.string(),
    targetHost: z.string(),
    scrapeIntervalSec: z.number().int(),
  }),
  flowNodeBase.extend({
    kind: z.literal('cloudPipeline'),
    pipelineId: z.string(),
    targetStreamName: z.string().optional(),
  }),
  flowNodeBase.extend({
    kind: z.literal('bulkEndpoint'),
    url: z.string().optional(),
  }),
  flowNodeBase.extend({
    kind: z.literal('wiredStream'),
    streamName: z.string(),
    processingStepCount: z.number().int(),
    routingRuleCount: z.number().int(),
    failureRate: flowFailureRateSchema.optional(),
  }),
  flowNodeBase.extend({
    kind: z.literal('classicStream'),
    streamName: z.string(),
    dataStream: z.string(),
    failureRate: flowFailureRateSchema.optional(),
  }),
]);

export type FlowNode = z.infer<typeof flowNodeSchema>;

// ── Edge schema ──────────────────────────────────────────────────────────────

export const flowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  kind: z.enum([
    'agent->endpoint',
    'agent->pipeline',
    'agentless->endpoint',
    'prometheus->pipeline',
    'prometheus->endpoint',
    'pipeline->stream',
    'bulk->stream',
    'stream->stream',
  ]),
  routingRuleId: z.string().optional(),
  isMock: z.boolean().optional(),
  health: flowHealthSchema.optional(),
  throughput: flowThroughputSchema.optional(),
});

export type FlowEdge = z.infer<typeof flowEdgeSchema>;

// ── Top-level payload ────────────────────────────────────────────────────────

export const flowGraphPayloadSchema = z.object({
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
  meta: z.object({
    generatedAt: z.number().int(),
    fleetAvailable: z.boolean(),
    cloudPipelinesMock: z.literal(true),
    prometheusMock: z.literal(true),
    timeWindow: z.object({ start: z.number().int(), end: z.number().int() }),
  }),
});

export type FlowGraphPayload = z.infer<typeof flowGraphPayloadSchema>;

export const flowThroughputPayloadSchema = z.object({
  perNode: z.record(z.string(), flowThroughputSchema),
  perNodeFailureRate: z.record(z.string(), flowFailureRateSchema),
  perNodeHealth: z.record(z.string(), flowHealthSchema),
  perEdge: z.record(z.string(), flowThroughputSchema),
  generatedAt: z.number().int(),
});

export type FlowThroughputPayload = z.infer<typeof flowThroughputPayloadSchema>;
