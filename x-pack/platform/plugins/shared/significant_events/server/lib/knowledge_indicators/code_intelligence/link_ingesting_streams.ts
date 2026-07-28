/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  normalizeFeatureSlug,
  type Feature,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient } from '../knowledge_indicator_client';
import { reconcileCodeFeatures } from './reconcile_code_features';
import { formatCitations } from './identify_code_features';
import type { CodeEvidenceCitation } from './types';

/** A real stream and the index/pattern its data lives in. */
export interface StreamSamplingSource {
  name: string;
  index: string;
  /** The telemetry convention used by this stream. */
  convention: 'otel' | 'ecs';
}

/**
 * A log-bearing stream and the concrete message field to query over it. The log
 * pipeline (and therefore code predictive queries) matches on the message
 * content, not a service field — log streams here carry no queryable service
 * field, so the message is the join signal.
 */
export interface LogStreamBinding {
  stream: string;
  index: string;
  convention: 'otel' | 'ecs';
  /** Field that carries the log message text. */
  messageField: string;
  /** Whether `messageField` is a `text` field (use `MATCH_PHRASE`, not `LIKE`). */
  messageIsText: boolean;
}

// Candidate fields that carry the log message, most-specific first (ECS
// `message`, then OTel `body.text` / `body`).
const MESSAGE_FIELD_CANDIDATES = ['message', 'body.text', 'message.text', 'body'];

interface FieldCapsEntry {
  [type: string]: { type?: string; aggregatable?: boolean; searchable?: boolean } | undefined;
}

/**
 * Picks the keyword-capable variant of a field: the field itself if it is
 * `keyword`, otherwise its `.keyword` multifield.
 */
const keywordVariantOf = (
  field: string,
  caps: Record<string, FieldCapsEntry>
): string | undefined => {
  if (caps[field]?.keyword) {
    return field;
  }
  const sub = `${field}.keyword`;
  if (caps[sub]?.keyword) {
    return sub;
  }
  return undefined;
};

/**
 * Resolves the log-bearing stream(s) that predictive code queries can target,
 * and the message field to query each with. A stream qualifies when it exposes a
 * usable message field (keyword → `LIKE`, or `text` → `MATCH_PHRASE`).
 */
export async function resolveLogBearingStreams({
  streams,
  esClient,
  logger,
}: {
  streams: StreamSamplingSource[];
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<LogStreamBinding[]> {
  const bindings: LogStreamBinding[] = [];

  await Promise.all(
    streams.map(async ({ name, index, convention }) => {
      try {
        const { fields } = await esClient.fieldCaps({
          index,
          fields: [
            ...MESSAGE_FIELD_CANDIDATES,
            ...MESSAGE_FIELD_CANDIDATES.map((f) => `${f}.keyword`),
          ],
          ignore_unavailable: true,
        });
        const caps = fields as Record<string, FieldCapsEntry>;

        // Prefer a keyword message field (usable with LIKE); else the first
        // searchable text field (usable with MATCH_PHRASE).
        let messageField: string | undefined;
        let messageIsText = false;
        for (const candidate of MESSAGE_FIELD_CANDIDATES) {
          const keywordField = keywordVariantOf(candidate, caps);
          if (keywordField) {
            messageField = keywordField;
            messageIsText = false;
            break;
          }
          if (caps[candidate]?.text) {
            messageField = candidate;
            messageIsText = true;
            break;
          }
        }

        if (!messageField) {
          return;
        }

        bindings.push({ stream: name, index, convention, messageField, messageIsText });
      } catch (error) {
        logger.debug(
          `code_features: log-stream probe failed for "${name}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    })
  );

  return bindings.sort((a, b) => a.stream.localeCompare(b.stream));
}

/**
 * The log-bearing stream name(s) predictive code queries target (names only; see
 * {@link resolveLogBearingStreams} for the message field to query each with).
 */
export async function resolveIngestingStreams(args: {
  streams: StreamSamplingSource[];
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<string[]> {
  const bindings = await resolveLogBearingStreams(args);
  return bindings.map((binding) => binding.stream);
}

const ENTITY_FEATURE_TYPE = 'entity';
const SERVICE_ENTITY_SUBTYPE = 'service';
/** Confidence for a service name grounded in explicit telemetry configuration. */
export const SERVICE_ENTITY_CONFIDENCE_GROUNDED = 100;
/** Confidence for a service name inferred from code without explicit telemetry configuration. */
export const SERVICE_ENTITY_CONFIDENCE_INFERRED = 70;

/**
 * Additional code-derived facts about a service that the `github.code_researcher`
 * agent reports alongside its identity. Stored on the service entity KI's
 * properties so they travel with the service (and merge onto any log-derived
 * entity during reconciliation).
 */
export interface ServiceCodeMetadata {
  /** Declared service/app version (package manifest, chart, pinned image tag). */
  version?: string;
  /** Notable telemetry/logging env vars, e.g. `OTEL_SERVICE_NAME=cartservice`. */
  environmentVariables?: string[];
  /** Repository-relative OTel/logging SDK config file paths. */
  configPaths?: string[];
  /** How the service logs: `otel`, `other`, or `unknown`. */
  loggingPattern?: string;
  /** Whether the service is instrumented for distributed tracing. */
  tracing?: boolean;
  /** Commit SHA the evidence was read at, when known. */
  gitSha?: string;
  /** Repository-relative root directory for this deployable service. */
  serviceRoot?: string;
  /** Infrastructure-as-code files associated with this service's repository. */
  iacSignals?: Array<{ kind: string; path: string }>;
}

/** Scores service identity by whether explicit telemetry configuration grounds it. */
export const serviceEntityConfidence = (metadata?: ServiceCodeMetadata): number => {
  const hasOtelServiceName = metadata?.environmentVariables?.some((variable) =>
    /^OTEL_SERVICE_NAME(=|$)/.test(variable)
  );
  const hasConfigPath = Boolean(metadata?.configPaths?.length);
  return hasOtelServiceName || hasConfigPath
    ? SERVICE_ENTITY_CONFIDENCE_GROUNDED
    : SERVICE_ENTITY_CONFIDENCE_INFERRED;
};

export type TelemetryFamily = 'otel' | 'ecs' | 'unknown';

/**
 * Infers the telemetry family a service emits. Unknown evidence deliberately
 * preserves the full stream fan-out.
 */
export const telemetryFamilyFor = (metadata?: ServiceCodeMetadata): TelemetryFamily => {
  if (metadata?.loggingPattern === 'otel' || metadata?.tracing === true) {
    return 'otel';
  }
  return metadata?.loggingPattern === 'other' ? 'ecs' : 'unknown';
};

/** Narrows predictive writes by family without ever dropping all eligible streams. */
export const filterPredictiveBindings = (
  bindings: LogStreamBinding[],
  metadata?: ServiceCodeMetadata
): LogStreamBinding[] => {
  const family = telemetryFamilyFor(metadata);
  if (family === 'unknown') {
    return bindings;
  }
  const filtered = bindings.filter((binding) => binding.convention === family);
  return filtered.length > 0 ? filtered : bindings;
};

/** Maps {@link ServiceCodeMetadata} onto snake_cased entity KI property keys. */
const serviceMetadataToProperties = (
  metadata: ServiceCodeMetadata | undefined
): Record<string, unknown> => {
  if (!metadata) {
    return {};
  }
  const properties: Record<string, unknown> = {};
  if (metadata.version) properties.version = metadata.version;
  if (metadata.environmentVariables?.length) {
    properties.environment_variables = metadata.environmentVariables;
  }
  if (metadata.configPaths?.length) properties.config_paths = metadata.configPaths;
  if (metadata.loggingPattern) properties.logging_pattern = metadata.loggingPattern;
  if (typeof metadata.tracing === 'boolean') properties.tracing = metadata.tracing;
  if (metadata.gitSha) properties.git_sha = metadata.gitSha;
  if (metadata.serviceRoot) properties.service_root = metadata.serviceRoot;
  if (metadata.iacSignals?.length) properties.iac_signals = metadata.iacSignals;
  return properties;
};

const matchesService = (feature: Feature, serviceName: string): boolean => {
  const name = typeof feature.properties?.name === 'string' ? feature.properties.name : undefined;
  const normalized = serviceName.trim().toLowerCase();
  return (
    name?.toLowerCase() === normalized ||
    normalizeFeatureSlug(feature.id) === normalizeFeatureSlug(serviceName) ||
    feature.title?.toLowerCase() === normalized
  );
};

/**
 * Represents a code-derived service as an `entity`/`service` KI on the real
 * stream(s) that ingest it — the same taxonomy the log pipeline uses. When a
 * matching log-derived entity already exists on a stream, the code evidence is
 * merged onto it (reusing its slug) so the two become a single KI with
 * `source: both`; otherwise a predictive entity is created (slug = service name)
 * ready to merge once logs arrive.
 *
 * Runs in the per-service stage — always, regardless of whether the code
 * changed — so it tracks log entities that appear after the code was analyzed.
 */
export async function linkServiceEntities({
  serviceName,
  repository,
  fingerprint,
  citations,
  metadata,
  streams,
  esClient,
  kiClient,
  runId,
  logger,
}: {
  serviceName: string;
  repository: string;
  fingerprint?: string;
  /** Source files the agent cited as evidence for this service, if any. */
  citations?: CodeEvidenceCitation[];
  /** Additional code-derived facts about the service (version, env vars, etc.). */
  metadata?: ServiceCodeMetadata;
  streams: StreamSamplingSource[];
  esClient: ElasticsearchClient;
  kiClient: KnowledgeIndicatorClient;
  runId: string;
  logger: Logger;
}): Promise<{ streams: string[] }> {
  const bindings = await resolveLogBearingStreams({ streams, esClient, logger });
  if (bindings.length === 0) {
    return { streams: [] };
  }

  const ref = fingerprint ? `${repository}@${fingerprint}` : repository;
  const evidence = formatCitations(citations, ref) ?? [
    `code: ${ref} service identified by github.code_researcher agent`,
  ];
  const metadataProperties = serviceMetadataToProperties(metadata);

  // Find existing log-derived service entities to merge onto.
  const matches = new Map<string, Feature>();
  await Promise.all(
    bindings.map(async ({ stream }) => {
      const { hits } = await kiClient.getFeatures(stream, {
        type: [ENTITY_FEATURE_TYPE],
        includeExcluded: true,
      });
      const match = hits.find(
        (feature) =>
          feature.subtype === SERVICE_ENTITY_SUBTYPE && matchesService(feature, serviceName)
      );
      if (match) {
        matches.set(stream, match);
      }
    })
  );

  // Matches always win; only predictive entities narrow to the inferred
  // telemetry family, with a fallback to every log-bearing stream.
  const targetStreams = (
    matches.size > 0
      ? bindings.filter((binding) => matches.has(binding.stream))
      : filterPredictiveBindings(bindings, metadata)
  ).map((binding) => binding.stream);

  const written: string[] = [];
  for (const stream of targetStreams) {
    const match = matches.get(stream);
    const predicted = !match;
    const incoming: FeatureUpsert = {
      id: match?.id ?? serviceName,
      stream_name: stream,
      type: ENTITY_FEATURE_TYPE,
      subtype: SERVICE_ENTITY_SUBTYPE,
      title: match?.title ?? serviceName,
      description: predicted
        ? `Service "${serviceName}" predicted from code (not yet observed in logs).`
        : `Service "${serviceName}" corroborated by code.`,
      properties: { repository, name: serviceName, predicted, ...metadataProperties },
      confidence: serviceEntityConfidence(metadata),
      evidence,
    };

    const { hits: existingOnStream } = await kiClient.getFeatures(stream, {
      type: [ENTITY_FEATURE_TYPE],
      includeExcluded: true,
    });
    const reconciled = reconcileCodeFeatures({
      incoming: [incoming],
      existing: existingOnStream,
      runId,
    });
    await kiClient.bulk(
      stream,
      reconciled.map((feature) => ({ index: { feature } }))
    );
    written.push(stream);
  }

  logger.debug(
    `code_features: linked service "${serviceName}" as entity on stream(s) [${written.join(', ')}]${
      matches.size > 0 ? ' (merged with log entity)' : ' (predictive)'
    }`
  );

  return { streams: written };
}
