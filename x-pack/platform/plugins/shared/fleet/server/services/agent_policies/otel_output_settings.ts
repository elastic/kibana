/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { parse } from 'yaml';

import type { Output } from '../../types';
import type { OutputPreset, PresetCapableOutput } from '../../../common/types/models/output';
import {
  getDefaultPresetForEsOutput,
  outputTypeSupportPresets,
} from '../../../common/services/output_helpers';

/**
 * Translates a Fleet Elasticsearch output into OpenTelemetry `elasticsearch` exporter settings.
 *
 * Fleet outputs are expressed in Beats terms (`preset`, `worker`, `bulk_max_size`,
 * `queue.mem.*`, `compression_level`, …). For Beats-based inputs, elastic-agent translates
 * those into exporter settings itself in `internal/pkg/otel/translate/output_elasticsearch.go`
 * (`ESToOTelConfig`), producing the `elasticsearch/_agent-component/<output>` exporters.
 *
 * That translation is never applied to the collector config Fleet puts at the root of the
 * full agent policy for `otelcol` inputs: elastic-agent forwards those keys verbatim
 * (`internal/pkg/config/config.go` `OTelKeys`), and fleet-server only injects `api_key`
 * (`prepareOTelExporters`). Without the translation below, an OTel integration would send
 * through an exporter carrying only `endpoints` + `api_key`, i.e. with upstream
 * `elasticsearchexporter` defaults for batching, queueing, retries and compression rather
 * than the settings configured on the Fleet output.
 *
 * The values here mirror `ESToOTelConfig` and the Beats defaults it starts from
 * (`libbeat/outputs/elasticsearch/config.go`, `config_presets.go`) so that both exporters
 * generated for the same output behave the same way. Keep them in sync.
 *
 * In production every ES/remote-ES output always has a `preset` set — either by
 * `outputService.create` (which calls `getDefaultPresetForEsOutput`) or by
 * `backfillAllOutputPresets` (which runs at setup for any older outputs). When no explicit
 * preset is stored `getDefaultPresetForEsOutput` falls back to `balanced`, so this function
 * always translates.
 *
 * Transport settings (`timeout`, `idle_connection_timeout`, ssl, proxy) are deliberately out
 * of scope: the agent routes those through the `beatsauth` extension, which Fleet only emits
 * when the output actually configures ssl/proxy/transport fields (see `buildBeatsauthConfig`).
 * The preset's `idle_connection_timeout` is therefore not applied — a known, narrow gap, since
 * the exporter's own default request timeout already matches the Beats one.
 */

/** `memqueue.DefaultEvents` in Beats. */
const DEFAULT_QUEUE_MEM_EVENTS = 3200;

/**
 * Memory ceiling on in-flight events, mirroring `maxQueueEvents` in the agent. It only
 * engages for large host lists, where it trades connection utilisation for a bounded
 * footprint.
 */
const MAX_QUEUE_EVENTS = 64000;

const BULK_RESPONSE_FILTER_PATH = 'errors,items.*.error,items.*.status,items.*.failure_store';

/** Beats `elasticsearch.DefaultConfig()`, plus its default HTTP transport settings. */
const BEATS_ES_OUTPUT_DEFAULTS = {
  worker: 1,
  bulkMaxSize: 1600,
  compressionLevel: 1,
  queueMemEvents: DEFAULT_QUEUE_MEM_EVENTS,
  queueFlushMinEvents: 1600,
  queueFlushTimeout: '10s',
  maxRetries: 3,
  backoffInit: '1s',
  backoffMax: '60s',
} as const;

interface EsOutputPresetConfig {
  worker: number;
  bulkMaxSize: number;
  compressionLevel: number;
  queueMemEvents: number;
  queueFlushMinEvents: number;
  queueFlushTimeout: string;
  /**
   * Recorded to keep this table a faithful copy of the Beats one, but not translated: it is a
   * transport setting, which is out of scope here (see the module comment above).
   */
  idleConnectionTimeout: string;
  backoffInit?: string;
  backoffMax?: string;
}

/** Mirror of `presetConfigs` in `libbeat/outputs/elasticsearch/config_presets.go`. */
const ES_OUTPUT_PRESETS: Readonly<Partial<Record<OutputPreset, EsOutputPresetConfig>>> = {
  balanced: {
    bulkMaxSize: 1600,
    worker: 1,
    queueMemEvents: 3200,
    queueFlushMinEvents: 1600,
    queueFlushTimeout: '10s',
    compressionLevel: 1,
    idleConnectionTimeout: '3s',
  },
  throughput: {
    bulkMaxSize: 1600,
    worker: 4,
    queueMemEvents: 12800,
    queueFlushMinEvents: 1600,
    queueFlushTimeout: '5s',
    compressionLevel: 1,
    idleConnectionTimeout: '15s',
  },
  scale: {
    bulkMaxSize: 1600,
    worker: 1,
    queueMemEvents: 3200,
    queueFlushMinEvents: 1600,
    queueFlushTimeout: '20s',
    compressionLevel: 1,
    idleConnectionTimeout: '1s',
    backoffInit: '5s',
    backoffMax: '300s',
  },
  latency: {
    bulkMaxSize: 50,
    worker: 1,
    queueMemEvents: 4100,
    queueFlushMinEvents: 2050,
    queueFlushTimeout: '1s',
    compressionLevel: 1,
    idleConnectionTimeout: '60s',
  },
} as const;

/**
 * Beats retries every failed bulk request except 413, which it handles by splitting the
 * batch or dropping it when it cannot be split. Mirror of `defaultRetryOnStatus()`.
 */
const DEFAULT_RETRY_ON_STATUS: readonly number[] = [
  // 3xx
  300, 301, 302, 303, 304, 305, 307, 308,
  // 4xx, excluding 413 (Request Entity Too Large)
  400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 414, 415, 416, 417, 418, 421,
  422, 423, 424, 425, 426, 428, 429, 431, 451,
  // 5xx
  500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
];

/** Beats' retry behaviour for individual bulk response items. */
const DEFAULT_RETRY_ON_DOCUMENT_STATUS: readonly number[] = [
  429, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
];

/**
 * Effective Beats-level output settings, after the performance preset has been applied.
 * Extends `EsOutputPresetConfig` for the 6 fields the two types share, omitting the three
 * that differ (`idleConnectionTimeout` is out of scope; `backoffInit`/`backoffMax` are
 * required here because defaults have been applied, optional in the preset table).
 */
interface EffectiveEsOutputSettings
  extends Omit<EsOutputPresetConfig, 'idleConnectionTimeout' | 'backoffInit' | 'backoffMax'> {
  maxRetries: number;
  backoffInit: string;
  backoffMax: string;
  headers?: Record<string, string>;
  /**
   * `queue.mem.events` of the named preset, used as the throughput floor when sizing the
   * OTel queue. Undefined for `custom` (or no) preset, where the user owns every queue field.
   */
  presetQueueFloor?: number;
}

/**
 * Parses a YAML string to a plain object. Returns `{}` when the input is absent, not an
 * object, or malformed. The optional `onError` callback is called with the parse exception
 * so callers can log or rethrow as needed.
 */
export const parseYamlRecord = (
  yaml: string | null | undefined,
  onError?: (e: unknown) => void
): Record<string, unknown> => {
  if (!yaml) return {};
  try {
    const parsed = parse(yaml);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch (e) {
    onError?.(e);
  }
  return {};
};

const readNumberSetting = (
  config: Record<string, unknown>,
  path: string,
  fallback: number
): number => {
  // lodash `get` checks for the literal dotted key first (e.g. "queue.mem.events"), then
  // traverses nested maps — matching Beats' acceptance of both forms in config_yaml.
  const value = get(config, path);
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const readDurationSetting = (
  config: Record<string, unknown>,
  path: string,
  fallback: string
): string => {
  const value = get(config, path);
  // Beats accepts unit-less durations as seconds; the OTel exporterhelper does not, so
  // append the unit as the agent's translation does.
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value}s`;
  }
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
};

const readHeadersSetting = (
  config: Record<string, unknown>
): Record<string, string> | undefined => {
  const value = get(config, 'headers');
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const headers = Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [key, headerValue]) => {
      if (typeof headerValue === 'string') {
        acc[key] = headerValue;
      }
      return acc;
    },
    {}
  );
  return Object.keys(headers).length > 0 ? headers : undefined;
};

const getPresetConfig = (output: Output): EsOutputPresetConfig | undefined => {
  if (!outputTypeSupportPresets(output)) {
    return undefined;
  }
  // Mirrors transformOutputToFullPolicyOutput: an output with no explicit preset is sent to
  // agents as `balanced` unless its config_yaml sets a reserved performance key.
  // Use a safe parse wrapper so malformed config_yaml falls back to `balanced` rather than
  // throwing out of policy generation (consistent with parseYamlObject's own error policy).
  const safeParse = (yaml: string) => {
    try {
      return parse(yaml);
    } catch {
      return null;
    }
  };
  const preset = output.preset ?? getDefaultPresetForEsOutput(output.config_yaml ?? '', safeParse);
  return ES_OUTPUT_PRESETS[preset];
};

/**
 * Resolves the effective Beats-level settings of an Elasticsearch output: preset values win
 * over `config_yaml`, which wins over the Beats defaults. A named preset owns the whole queue
 * configuration, so `queue.*` from `config_yaml` is ignored when one is set — the same grouping
 * rule `ApplyPreset` implements.
 *
 * The keys read below (`worker`, `bulk_max_size`, `compression_level`, `queue.mem.*`) are a
 * subset of `RESERVED_CONFIG_YML_KEYS` (common/constants/output.ts) — the keys whose presence
 * in `config_yaml` causes `getDefaultPresetForEsOutput` to resolve `custom` rather than
 * `balanced`. If a new key is added to that constant it must also be read here so the OTel
 * translation stays consistent with the Beats-side preset detection.
 *
 * Note: `RESERVED_CONFIG_YML_KEYS` currently lists `'connection_idle_timeout'` but Beats and
 * this file's preset table use `'idle_connection_timeout'` — that is a pre-existing discrepancy
 * in the constant; it does not affect the translation here since `idleConnectionTimeout` is
 * intentionally out of scope (see the module comment above).
 */
const resolveEffectiveEsOutputSettings = (
  output: Output & PresetCapableOutput
): EffectiveEsOutputSettings => {
  const configYaml = parseYamlRecord(output.config_yaml);
  const preset = getPresetConfig(output);

  return {
    worker:
      preset?.worker ?? readNumberSetting(configYaml, 'worker', BEATS_ES_OUTPUT_DEFAULTS.worker),
    bulkMaxSize:
      preset?.bulkMaxSize ??
      readNumberSetting(configYaml, 'bulk_max_size', BEATS_ES_OUTPUT_DEFAULTS.bulkMaxSize),
    compressionLevel:
      preset?.compressionLevel ??
      readNumberSetting(configYaml, 'compression_level', BEATS_ES_OUTPUT_DEFAULTS.compressionLevel),
    queueMemEvents: preset
      ? preset.queueMemEvents
      : readNumberSetting(configYaml, 'queue.mem.events', BEATS_ES_OUTPUT_DEFAULTS.queueMemEvents),
    queueFlushMinEvents: preset
      ? preset.queueFlushMinEvents
      : readNumberSetting(
          configYaml,
          'queue.mem.flush.min_events',
          BEATS_ES_OUTPUT_DEFAULTS.queueFlushMinEvents
        ),
    queueFlushTimeout: preset
      ? preset.queueFlushTimeout
      : readDurationSetting(
          configYaml,
          'queue.mem.flush.timeout',
          BEATS_ES_OUTPUT_DEFAULTS.queueFlushTimeout
        ),
    maxRetries: readNumberSetting(configYaml, 'max_retries', BEATS_ES_OUTPUT_DEFAULTS.maxRetries),
    backoffInit:
      preset?.backoffInit ??
      readDurationSetting(configYaml, 'backoff.init', BEATS_ES_OUTPUT_DEFAULTS.backoffInit),
    backoffMax:
      preset?.backoffMax ??
      readDurationSetting(configYaml, 'backoff.max', BEATS_ES_OUTPUT_DEFAULTS.backoffMax),
    headers: readHeadersSetting(configYaml),
    presetQueueFloor: preset?.queueMemEvents,
  };
};

/**
 * Computes the OTel queue size and consumer count for a named performance preset. Mirror of
 * `calcNamedPresetSizing` in the agent: two consumers per connection so one sends while the
 * other stages the next batch, and two batches per consumer in the queue so no consumer
 * stalls, never dropping below the throughput floor the preset implies.
 */
const calcNamedPresetSizing = (
  maxConns: number,
  batchSize: number,
  floor: number
): { queueSize: number; numConsumers: number } => {
  let numConsumers = 2 * maxConns;
  let queueSize = 2 * batchSize * numConsumers;

  if (queueSize > MAX_QUEUE_EVENTS) {
    // Large host lists would otherwise demand unbounded in-flight events. Scale back
    // proportionally, keeping the queue-to-batch ratio constant at the memory ceiling.
    queueSize = MAX_QUEUE_EVENTS;
    numConsumers = Math.max(1, Math.floor(queueSize / (2 * batchSize)));
    if (floor > queueSize) {
      queueSize = floor;
      numConsumers = Math.max(1, Math.floor(queueSize / (2 * batchSize)));
    }
  } else if (floor > queueSize) {
    // The floor is above the formula result but below the memory ceiling, so only the queue
    // size needs to grow; numConsumers stays at the connection-model value.
    queueSize = floor;
  }

  return { queueSize, numConsumers };
};

/**
 * Builds the OTel `elasticsearch` exporter settings that correspond to a Fleet output's
 * Elasticsearch configuration. `endpoints` and authentication are added by the caller;
 * `index`/`logs_index` is deliberately not translated because a static index would disable
 * the dynamic `data_stream.*` routing that OTel integrations rely on.
 */
export const buildOtelEsExporterConfig = (
  output: Output & PresetCapableOutput
): Record<string, unknown> => {
  const settings = resolveEffectiveEsOutputSettings(output);

  // Beats opens one connection per host per worker, and the agent derives the OTel
  // connection bound the same way.
  const maxConns = Math.max(1, output.hosts?.length ?? 1) * Math.max(1, settings.worker);
  const batchSize = Math.max(1, Math.min(settings.queueFlushMinEvents, settings.bulkMaxSize));

  const { queueSize, numConsumers } =
    settings.presetQueueFloor !== undefined
      ? calcNamedPresetSizing(maxConns, batchSize, settings.presetQueueFloor)
      : // For `custom` (or no) preset the user owns queue.mem.events and it must not be
        // overridden; num_consumers has no Beats equivalent, so apply the same
        // two-per-connection staging model regardless.
        { queueSize: settings.queueMemEvents, numConsumers: 2 * maxConns };

  // On the named-preset path calcNamedPresetSizing already ensures queueSize >= batchSize.
  // On the custom path the user controls queueMemEvents directly, so clamp min_size down
  // instead of touching the queue size the user configured.
  const batchMinSize = Math.min(batchSize, queueSize);

  return {
    // max_conns_per_host bounds the connection count: num_consumers is deliberately set
    // above it, so without this the extra consumers would open extra connections and change
    // the Elasticsearch-side load the sizing above is written to avoid.
    max_conns_per_host: maxConns,
    sending_queue: {
      enabled: true,
      block_on_overflow: true,
      wait_for_result: true,
      num_consumers: numConsumers,
      queue_size: queueSize,
      batch: {
        flush_timeout: settings.queueFlushTimeout,
        // Beats bulk_max_size: 0 means "don't split" (unbounded); clamp to 1 since the OTel
        // exporter requires a positive value and min_size is already floored at 1.
        max_size: Math.max(1, settings.bulkMaxSize),
        min_size: batchMinSize,
        sizer: 'items',
      },
    },
    logs_dynamic_id: { enabled: true },
    logs_dynamic_pipeline: { enabled: true },
    include_source_on_error: true,
    suppress_conflict_errors: true,
    bulk_response_filter_path: BULK_RESPONSE_FILTER_PATH,
    retry:
      settings.maxRetries === 0
        ? { enabled: false }
        : {
            enabled: true,
            // Beats max_retries: -1 means "retry forever"; negative values are not valid for
            // the OTel exporter, so we omit the field and let the exporter use its own default
            // (which is also effectively unbounded).
            ...(settings.maxRetries > 0 ? { max_retries: settings.maxRetries } : {}),
            initial_interval: settings.backoffInit,
            max_interval: settings.backoffMax,
            retry_on_status: [...DEFAULT_RETRY_ON_STATUS],
            retry_on_document_status: [...DEFAULT_RETRY_ON_DOCUMENT_STATUS],
          },
    compression: settings.compressionLevel > 0 ? 'gzip' : 'none',
    ...(settings.compressionLevel > 0
      ? { compression_params: { level: settings.compressionLevel } }
      : {}),
    ...(settings.headers ? { headers: settings.headers } : {}),
  };
};
