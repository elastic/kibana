/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import pMap from 'p-map';

import {
  LOGSDB_COLUMNAR_INDEX_MODE,
  getLogsdbColumnarReadiness,
  getRegistryDataStreamAssetBaseName,
  isLogsdbColumnarReady,
} from '../../../../../common/services';
import type { ColumnarPackageInfo } from '../../../../../common/services/columnar_index_mode';
import type { Installation, RegistryDataStream, TemplateMap } from '../../../../types';
import { MAX_CONCURRENT_COMPONENT_TEMPLATES } from '../../../../constants';

/**
 * Mapping parameters Elasticsearch rejects in the columnar index modes: the columnar format
 * stores every field once as doc values and reconstructs `_source` from them, so a field that
 * opts out of doc values, or that asks for a separate stored copy, cannot be represented.
 *
 * Only the rejected values are stripped — `doc_values: true` and `store: false` are the
 * defaults and are left alone.
 */
const STRIPPED_MAPPING_PARAMS: Array<[param: 'doc_values' | 'store', rejectedValue: boolean]> = [
  ['doc_values', false],
  ['store', true],
];

function stripFromMappingNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(stripFromMappingNode);
  }
  if (!node || typeof node !== 'object') {
    return node;
  }

  const source = node as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    const stripped = STRIPPED_MAPPING_PARAMS.find(
      ([param, rejectedValue]) => key === param && value === rejectedValue
    );
    if (stripped) {
      continue;
    }
    // Recurse into every object value: this covers `properties`, multi-fields (`fields`),
    // `dynamic_templates` entries and their `mapping` blocks without having to enumerate the
    // mapping grammar.
    result[key] = stripFromMappingNode(value);
  }

  return result;
}

/**
 * Removes `doc_values: false` and `store: true` from a component template map so the composed
 * mappings are accepted in the `logsdb_columnar` index mode. Covers static fields, multi-fields,
 * dynamic templates and the `index_template.mappings.properties` block merged in from the
 * package manifest, because it runs over the finished component templates.
 *
 * See https://github.com/elastic/kibana/issues/296252 (item 6).
 */
export function stripColumnarIncompatibleMappings(componentTemplates: TemplateMap): TemplateMap {
  const result: TemplateMap = {};

  for (const [name, entry] of Object.entries(componentTemplates)) {
    const template = entry.template;
    if (template && 'mappings' in template && template.mappings) {
      result[name] = {
        ...entry,
        template: {
          ...template,
          mappings: stripFromMappingNode(template.mappings) as typeof template.mappings,
        },
      };
    } else {
      result[name] = entry;
    }
  }

  return result;
}

/**
 * Decides whether a data stream's index template should carry
 * `settings.index.mode: logsdb_columnar`.
 *
 * - A data stream that is not columnar-ready (`unsupported` or nothing declared) never gets it.
 * - An explicit user choice, stored once per installation, always wins.
 * - Without a user choice, `default` readiness applies to new installations only; existing data
 *   streams keep whatever mode their index template already has, so an `opt_in` -> `default`
 *   package upgrade never flips them.
 */
export function resolveLogsdbColumnarIndexMode({
  readiness,
  userChoice,
  isNewInstall,
  currentIndexMode,
}: {
  readiness?: ReturnType<typeof getLogsdbColumnarReadiness>;
  userChoice?: boolean;
  isNewInstall: boolean;
  currentIndexMode?: string;
}): typeof LOGSDB_COLUMNAR_INDEX_MODE | undefined {
  if (!isLogsdbColumnarReady(readiness)) {
    return undefined;
  }
  if (userChoice !== undefined) {
    return userChoice ? LOGSDB_COLUMNAR_INDEX_MODE : undefined;
  }
  if (isNewInstall) {
    return readiness === 'default' ? LOGSDB_COLUMNAR_INDEX_MODE : undefined;
  }
  return currentIndexMode === LOGSDB_COLUMNAR_INDEX_MODE ? LOGSDB_COLUMNAR_INDEX_MODE : undefined;
}

/**
 * Reads `settings.index.mode` of the index templates that are already installed for the given
 * data streams. Missing templates (fresh install, new data stream) resolve to `undefined`.
 */
export async function getCurrentIndexModes(
  esClient: ElasticsearchClient,
  templateNames: string[]
): Promise<Map<string, string | undefined>> {
  const entries = await pMap(
    templateNames,
    async (templateName) => {
      try {
        const res = await esClient.indices.getIndexTemplate(
          { name: templateName },
          { ignore: [404] }
        );
        const mode =
          res?.index_templates?.[0]?.index_template?.template?.settings?.index?.mode ?? undefined;
        return [templateName, mode] as const;
      } catch (err) {
        if (err?.statusCode === 404) {
          return [templateName, undefined] as const;
        }
        throw err;
      }
    },
    { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
  );

  return new Map(entries);
}

/**
 * Resolves the target index mode of every data stream of a package, keyed by the data stream
 * asset base name (which is also its index template name).
 *
 * Only logs data streams that declare columnar readiness can end up with a mode here; every
 * other data stream maps to `undefined`, which leaves `index_mode: time_series` and the cluster
 * default untouched.
 */
export async function resolveColumnarIndexModes({
  esClient,
  logger,
  packageInfo,
  dataStreams,
  installedPkg,
}: {
  esClient?: ElasticsearchClient;
  logger?: Logger;
  packageInfo: ColumnarPackageInfo & { name: string; version: string };
  dataStreams: RegistryDataStream[];
  installedPkg?: Installation;
}): Promise<Map<string, string | undefined>> {
  const isNewInstall = !installedPkg;
  const userChoice = installedPkg?.logsdb_columnar_enabled;

  const logsDataStreams = dataStreams.filter((dataStream) => dataStream.type === 'logs');
  if (logsDataStreams.length === 0) {
    return new Map();
  }

  // The current mode only matters for an existing installation: a fresh install has no index
  // templates to preserve a mode from, and nothing to move back to LogsDB either.
  const currentIndexModes =
    !isNewInstall && esClient
      ? await getCurrentIndexModes(
          esClient,
          logsDataStreams.map((dataStream) => getRegistryDataStreamAssetBaseName(dataStream))
        )
      : new Map<string, string | undefined>();

  const resolved = new Map<string, string | undefined>();

  for (const dataStream of logsDataStreams) {
    const templateName = getRegistryDataStreamAssetBaseName(dataStream);
    const readiness = getLogsdbColumnarReadiness(packageInfo, dataStream);
    const currentIndexMode = currentIndexModes.get(templateName);

    // The data stream is on columnar today but the new package version no longer declares it
    // ready (explicitly `unsupported`, or the readiness was dropped altogether). Fleet removes
    // the mode and the data stream goes back to LogsDB at the next rollover, so say why.
    if (currentIndexMode === LOGSDB_COLUMNAR_INDEX_MODE && !isLogsdbColumnarReady(readiness)) {
      logger?.warn(
        `${templateName} is marked unsupported for logsdb_columnar by ${packageInfo.name} ${packageInfo.version}; moved back to LogsDB at next rollover`
      );
    }

    resolved.set(
      templateName,
      resolveLogsdbColumnarIndexMode({
        readiness,
        userChoice,
        isNewInstall,
        currentIndexMode,
      })
    );
  }

  return resolved;
}
