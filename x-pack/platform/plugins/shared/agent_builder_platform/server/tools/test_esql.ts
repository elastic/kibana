/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';

const testEsqlSchema = z.object({});

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  snapshot: boolean;
  raw: string;
}

const parseVersion = (versionString: string): ParsedVersion => {
  const clean = versionString.replace(/-SNAPSHOT.*$/, '');
  const [majorStr, minorStr, patchStr] = clean.split('.');
  return {
    major: Number(majorStr) || 0,
    minor: Number(minorStr) || 0,
    patch: Number(patchStr) || 0,
    snapshot: versionString.includes('-SNAPSHOT'),
    raw: versionString,
  };
};

interface ClusterInfo {
  cluster: string;
  version: string;
  parsed: ParsedVersion;
  buildFlavor: 'serverless' | 'default';
  isServerless: boolean;
  snapshot: boolean;
  lucene: string;
  viaShowInfo: boolean;
}

const getClusterInfoViaShowInfo = async (
  esClient: ElasticsearchClient
): Promise<ClusterInfo | null> => {
  // GET / requires cluster:monitor — fall back to SHOW INFO (ES|QL only needs query privileges).
  // SHOW INFO returns version/date/hash. On Serverless the version field can still be a non-semver build id
  // (e.g. "a]b1c2d3e4f5") even when GET / would return a semver — we use that to detect Serverless here.
  const result = await esClient.esql.query({ query: 'SHOW INFO', format: 'json' });
  const firstRow = result.values?.[0];
  if (!firstRow) {
    return null;
  }

  const [version] = firstRow as string[];
  const isSemver = /^\d+\.\d+\.\d+/.test(version);
  const isServerless = !isSemver;
  // Synthetic high version when SHOW INFO is non-semver: capability checks must use isServerless, not parsed.
  const parsed = isSemver ? parseVersion(version) : parseVersion('99.0.0');
  return {
    cluster: '(unknown — limited API key)',
    version: isServerless ? `${version} (Serverless)` : version,
    parsed,
    buildFlavor: isServerless ? 'serverless' : 'default',
    isServerless,
    snapshot: parsed.snapshot,
    lucene: '(unknown)',
    viaShowInfo: true,
  };
};

const getClusterInfo = async (esClient: ElasticsearchClient): Promise<ClusterInfo> => {
  try {
    const info = await esClient.info();
    const parsed = parseVersion(info.version.number);
    const buildFlavor = (info.version.build_flavor || 'default') as 'serverless' | 'default';
    return {
      cluster: info.cluster_name,
      version: info.version.number,
      parsed,
      buildFlavor,
      isServerless: buildFlavor === 'serverless',
      snapshot: parsed.snapshot,
      lucene: info.version.lucene_version,
      viaShowInfo: false,
    };
  } catch {
    const fallback = await getClusterInfoViaShowInfo(esClient);
    if (!fallback) {
      throw new Error('Could not determine cluster info via GET / or SHOW INFO');
    }
    return fallback;
  }
};

interface FeatureSpec {
  name: string;
  minVersion: [number, number];
  status: (parsed: ParsedVersion) => string;
}

const FEATURE_SPECS: FeatureSpec[] = [
  { name: 'ES|QL (GA)', minVersion: [8, 14], status: () => 'GA' },
  { name: 'Async queries', minVersion: [8, 13], status: () => 'GA' },
  { name: 'Spatial functions', minVersion: [8, 14], status: () => 'GA' },
  { name: 'Type casting (::)', minVersion: [8, 15], status: () => 'GA' },
  {
    name: 'MATCH/QSTR functions',
    minVersion: [8, 17],
    status: ({ major }) => (major >= 9 ? 'GA' : 'Preview'),
  },
  {
    name: 'LOOKUP JOIN',
    minVersion: [8, 18],
    status: ({ major, minor }) => (major >= 9 && minor >= 1 ? 'GA' : 'Preview'),
  },
  { name: 'Scoring (_score)', minVersion: [8, 18], status: () => 'GA' },
  {
    name: 'KQL function',
    minVersion: [8, 18],
    status: ({ major }) => (major >= 9 ? 'GA' : 'Preview'),
  },
  {
    name: 'INLINE STATS',
    minVersion: [9, 2],
    status: ({ major, minor }) => (major >= 9 && minor >= 3 ? 'GA' : 'Preview'),
  },
  { name: 'Multi-field JOIN', minVersion: [9, 2], status: () => 'GA' },
  {
    name: 'CHANGE_POINT',
    minVersion: [8, 19],
    status: ({ major, minor }) => (major >= 9 && minor >= 2 ? 'GA' : 'Preview'),
  },
  { name: 'TS command', minVersion: [9, 2], status: () => 'Preview' },
  { name: 'FORK / FUSE', minVersion: [9, 1], status: () => 'Preview' },
  { name: 'COMPLETION', minVersion: [8, 19], status: () => 'Preview' },
  { name: 'SET directive', minVersion: [9, 3], status: () => 'Preview' },
];

const computeFeatures = (info: ClusterInfo) => {
  const allAvailable = info.isServerless;
  const { major, minor } = info.parsed;
  return FEATURE_SPECS.map(({ name, minVersion: [minMajor, minMinor], status }) => {
    const available = allAvailable || major > minMajor || (major === minMajor && minor >= minMinor);
    return {
      name,
      available,
      status: available ? status(info.parsed) : 'not available',
    };
  });
};

const LIMITATIONS = [
  'Max result rows: 10,000 (no cursor pagination)',
  'Timezone: Not supported in DATE_FORMAT/DATE_PARSE',
  'Nested fields: Not supported',
];

export const testEsqlTool = (): BuiltinToolDefinition<typeof testEsqlSchema> => {
  return {
    id: platformCoreTools.testEsql,
    type: ToolType.builtin,
    description: `Detect cluster type, ES|QL version, and feature availability before generating ES|QL queries.

Call this tool first when starting an ES|QL workflow. It returns:
- Cluster name, version, build flavor (serverless | default), Lucene version
- Snapshot flag (for pre-release builds)
- ES|QL feature availability matrix (MATCH/QSTR, LOOKUP JOIN, KQL, INLINE STATS, TS command, CHANGE_POINT, ...)

If 'is_serverless' is true, ignore the reported version and assume all GA and preview ES|QL features are available.
If the API key lacks cluster:monitor, the tool falls back to ES|QL 'SHOW INFO' and sets 'via_show_info' to true.`,
    schema: testEsqlSchema,
    handler: async (_args, { esClient, logger }) => {
      logger.debug('test_esql tool invoked');
      const info = await getClusterInfo(esClient.asCurrentUser);
      const features = computeFeatures(info);

      // Probe whether ES|QL is actually available (the SHOW INFO path already proved this; the
      // GET / path didn't, so issue a trivial ROW query to confirm).
      let esqlAvailable = info.viaShowInfo;
      let esqlError: string | undefined;
      if (!esqlAvailable) {
        try {
          await esClient.asCurrentUser.esql.query({
            query: 'ROW message = "ES|QL is working!"',
            format: 'json',
          });
          esqlAvailable = true;
        } catch (err) {
          esqlAvailable = false;
          esqlError = err instanceof Error ? err.message : String(err);
        }
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              cluster: info.cluster,
              version: info.version,
              build_flavor: info.buildFlavor,
              is_serverless: info.isServerless,
              snapshot: info.snapshot,
              lucene: info.lucene,
              via_show_info: info.viaShowInfo,
              esql_available: esqlAvailable,
              ...(esqlError ? { esql_error: esqlError } : {}),
              features,
              limitations: LIMITATIONS,
            },
          },
        ],
      };
    },
    tags: [],
  };
};
