/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; You may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { parseDataset } from './parse_dataset';
import type { LoghubSystem } from './read_loghub_system_files';
import type { LoghubParser } from './types';
import type { StreamLogDocument, StreamLogGenerator } from '../types';

/**
 * - `source`: preserve relative timing from the LogHub file (`systemRpm` / timestamp spread).
 * - `uniform_interval`: emit one document every `60000 / targetRpm` ms in simulation time, cycling
 *   lines for message content only. Same `targetRpm` across systems → comparable document counts per
 *   `[from, to]` window (synthtrace / eval seeding).
 */
export type LoghubTimestampLayout = 'source' | 'uniform_interval';

// ── Realistic per-document metadata generation ────────────────────────────────
// Simulates the noise, partial overlap, and inconsistency of real production
// environments: shared hosts, cross-service traces, sparse fields, ambiguous
// tags — while keeping signal fields (service.name, data_layer, etc.) constant
// per system so the LLM must see through the mess.

type ServiceTheme = 'batch' | 'proxy' | 'mobile' | 'cloud' | 'stream' | 'infra' | 'homog';

function pickRandom<T>(choices: readonly T[] | T[]): T {
  return choices[Math.floor(Math.random() * choices.length)];
}

function randomHex(len: number): string {
  let hex = '';
  for (let i = 0; i < len; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return hex;
}

const SHARED_HOSTS = ['dp-worker-01', 'dp-worker-02', 'dp-worker-03', 'dp-worker-04'];

const DEDICATED_HOSTS: Record<ServiceTheme, string[]> = {
  batch: ['dp-batch-01', 'dp-batch-02'],
  proxy: ['proxy-edge-01', 'proxy-edge-02'],
  mobile: ['mobile-gw-01', 'mobile-gw-02'],
  cloud: ['nova-compute-01', 'nova-compute-02'],
  stream: ['dp-stream-01', 'dp-stream-02'],
  infra: ['infra-mon-01', 'infra-mon-02'],
  homog: ['syslog-01', 'syslog-02'],
};

const CROSS_SERVICE_TRACES = Array.from({ length: 8 }, () => randomHex(32));

const DEPLOYMENT_VERSIONS = ['v2.1.0', 'v2.1.1', 'v2.2.0', 'v2.3.0-rc1'] as const;

const SHARED_CONTAINER_IDS = Array.from({ length: 4 }, () => randomHex(12));

function buildPerDocMetadata(theme: ServiceTheme): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};

  if (Math.random() < 0.6) {
    metadata['host.hostname'] = pickRandom(DEDICATED_HOSTS[theme]);
  } else {
    metadata['host.hostname'] = pickRandom(SHARED_HOSTS);
  }

  metadata['process.pid'] = Math.floor(Math.random() * 60000) + 1000;

  if (Math.random() < 0.15) {
    metadata['trace.id'] = pickRandom(CROSS_SERVICE_TRACES);
  } else {
    metadata['trace.id'] = randomHex(32);
  }

  if (Math.random() < 0.7) {
    if (Math.random() < 0.2) {
      metadata['container.id'] = pickRandom(SHARED_CONTAINER_IDS);
    } else {
      metadata['container.id'] = randomHex(12);
    }
  }

  metadata['cloud.availability_zone'] = pickRandom(['us-east-1a', 'us-east-1b', 'us-east-1c']);

  if (Math.random() < 0.6) {
    metadata['deployment.version'] = pickRandom(DEPLOYMENT_VERSIONS);
  }

  metadata.environment = 'production';

  return metadata;
}

const SYSTEM_THEMES: Record<string, ServiceTheme> = {
  Hadoop: 'batch',
  Proxifier: 'proxy',
  Android: 'mobile',
  OpenStack: 'cloud',
  Mac: 'stream',
  Linux: 'infra',
  HPC: 'infra',
};

const SYSTEM_BASE_METADATA: Record<string, Record<string, unknown>> = {
  Hadoop: { 'service.name': 'data-platform', 'host.name': 'yarn-node-1', data_layer: 'batch' },
  Proxifier: { 'service.name': 'proxifier-proxy', 'host.name': 'proxy-1' },
  Android: {
    'service.name': 'android-system',
    'host.name': 'pixel-1',
    'os.platform': 'android',
  },
  OpenStack: {
    'service.name': 'openstack-nova',
    'host.name': 'compute-1',
    'cloud.provider': 'openstack',
  },
  Mac: { 'service.name': 'data-platform', 'host.name': 'dp-node-2', data_layer: 'streaming' },
  Linux: { 'service.name': 'infra-monitoring', 'host.name': 'mon-1' },
  HPC: {
    'service.name': 'infra-monitoring',
    'host.name': 'mon-2',
    'cluster.node_id': 'node-001',
  },
};

function generateMetadata(systemName: string): Record<string, unknown> {
  const theme = SYSTEM_THEMES[systemName];
  const base = SYSTEM_BASE_METADATA[systemName];
  if (theme && base) {
    return { ...base, ...buildPerDocMetadata(theme) };
  }
  if (base) {
    return base;
  }
  if (theme) {
    return buildPerDocMetadata(theme);
  }
  return {};
}

export function createLoghubGenerator({
  system,
  parser,
  log,
  targetRpm,
  streamType,
  timestampLayout = 'source',
}: {
  system: LoghubSystem;
  parser: LoghubParser;
  log: ToolingLog;
  targetRpm?: number;
  streamType: 'classic' | 'wired';
  timestampLayout?: LoghubTimestampLayout;
}): StreamLogGenerator {
  let index = 0;
  let start = 0;

  const { rpm: systemRpm, lines, min, range } = parseDataset({ system, parser });

  const count = lines.length;

  const speed = targetRpm === undefined ? 1 : targetRpm / systemRpm;

  const filepath = `${system.name}.log`;

  // Guard against Infinity when systemRpm is Infinity (all logs have identical timestamps)
  const effectiveRpm = Math.max(
    1,
    Math.round(targetRpm ?? (systemRpm === Infinity ? 1 : systemRpm))
  );
  const msBetween = 60000 / effectiveRpm;

  if (timestampLayout === 'uniform_interval') {
    log.debug(
      `LogHub ${system.name}: uniform_interval ~${effectiveRpm}rpm (${msBetween.toFixed(2)}ms/doc)`
    );
  } else {
    log.debug(
      `Throughput for ${system.name} will be around ${Math.round(targetRpm ?? systemRpm)}rpm`
    );
  }

  return {
    name: system.name,
    next: (timestamp) => {
      if (index === 0) {
        start = timestamp;
      }

      const docs: StreamLogDocument[] = [];

      if (timestampLayout === 'uniform_interval') {
        while (true) {
          const simulatedTimestamp = Math.floor(start + index * msBetween);

          if (simulatedTimestamp > timestamp) {
            break;
          }

          const line = lines[index % count];
          index++;

          docs.push({
            '@timestamp': simulatedTimestamp,
            message: parser.replaceTimestamp(line.message, simulatedTimestamp),
            ...parser.getFakeMetadata(line.message),
            ...generateMetadata(system.name),
            filepath,
            _index:
              streamType === 'classic' ? `logs-${system.name.toLowerCase()}-default` : undefined,
          });
        }

        return docs;
      }

      const safeRange = range > 0 ? range : 1;

      while (true) {
        const line = lines[index % count];

        const rotations = Math.floor(index / count);

        const rel = (line.timestamp - min) / safeRange;

        // add 1 ms per rotation to separate start and end events
        const delta = (1 / speed) * safeRange * (rel + rotations) + rotations;

        // ES likes its timestamp to be an integer
        const simulatedTimestamp = Math.floor(start + delta);

        if (simulatedTimestamp > timestamp) {
          break;
        }

        index++;

        docs.push({
          '@timestamp': simulatedTimestamp,
          message: parser.replaceTimestamp(line.message, simulatedTimestamp),
          ...parser.getFakeMetadata(line.message),
          ...generateMetadata(system.name),
          filepath,
          _index:
            streamType === 'classic' ? `logs-${system.name.toLowerCase()}-default` : undefined,
        });
      }

      return docs;
    },
  };
}
