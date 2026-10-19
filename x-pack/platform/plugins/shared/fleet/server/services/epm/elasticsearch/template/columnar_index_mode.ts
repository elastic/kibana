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
  getLogsdbColumnarNotReadyDataStreams,
  getLogsdbColumnarReadiness,
  getRegistryDataStreamAssetBaseName,
  isLogsdbColumnarReady,
} from '../../../../../common/services';
import type { ColumnarPackageInfo } from '../../../../../common/services/columnar_index_mode';
import type {
  EsAssetReference,
  Installation,
  RegistryDataStream,
  TemplateMap,
} from '../../../../types';
import { ElasticsearchAssetType } from '../../../../types';
import { MAX_CONCURRENT_COMPONENT_TEMPLATES } from '../../../../constants';

import { generateTemplateIndexPattern } from './template';

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
 * - Without a user choice, `default` readiness applies to new installations of an integration
 *   whose logs data streams are all ready: the switch can only be turned on for those, so a
 *   partly ready integration never starts on columnar. A data stream that a later package version
 *   adds to an existing installation follows what the installation already uses: it only gets
 *   columnar when it is `default` and the installation is on columnar, so an integration that
 *   already has data on LogsDB never gains a columnar data stream.
 * - Existing data streams keep whatever mode their index template already has, so an `opt_in` ->
 *   `default` package upgrade never flips them.
 */
export function resolveLogsdbColumnarIndexMode({
  readiness,
  userChoice,
  isNewInstall,
  isIntegrationReady = true,
  isNewDataStream = false,
  installationUsesColumnar = false,
  currentIndexMode,
}: {
  readiness?: ReturnType<typeof getLogsdbColumnarReadiness>;
  userChoice?: boolean;
  isNewInstall: boolean;
  /** Every logs data stream of the package is columnar-ready. */
  isIntegrationReady?: boolean;
  /** The data stream has no index template yet in an existing installation. */
  isNewDataStream?: boolean;
  /** A logs data stream of the existing installation is on `logsdb_columnar`. */
  installationUsesColumnar?: boolean;
  currentIndexMode?: string;
}): typeof LOGSDB_COLUMNAR_INDEX_MODE | undefined {
  if (!isLogsdbColumnarReady(readiness)) {
    return undefined;
  }
  if (userChoice !== undefined) {
    return userChoice ? LOGSDB_COLUMNAR_INDEX_MODE : undefined;
  }
  if (isNewInstall) {
    return readiness === 'default' && isIntegrationReady ? LOGSDB_COLUMNAR_INDEX_MODE : undefined;
  }
  if (isNewDataStream) {
    return readiness === 'default' && installationUsesColumnar
      ? LOGSDB_COLUMNAR_INDEX_MODE
      : undefined;
  }
  return currentIndexMode === LOGSDB_COLUMNAR_INDEX_MODE ? LOGSDB_COLUMNAR_INDEX_MODE : undefined;
}

/**
 * Reads `settings.index.mode` of the index templates that are already installed for the given
 * data streams. Missing templates (fresh install, new data stream) are left out of the map, so
 * `has()` tells an existing template without a mode apart from a template that does not exist.
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
        const indexTemplate = res?.index_templates?.[0]?.index_template;
        if (!indexTemplate) {
          return undefined;
        }
        return [templateName, indexTemplate.template?.settings?.index?.mode ?? undefined] as const;
      } catch (err) {
        if (err?.statusCode === 404) {
          return undefined;
        }
        throw err;
      }
    },
    { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
  );

  return new Map(entries.filter((entry) => entry !== undefined));
}

/**
 * Reads the index mode of the write indices of the data streams matching each index pattern,
 * keyed by index template name. Used when an index template is missing while its data streams
 * exist, for example after a failed install removed the templates before retrying. When the data
 * streams of a template (one per namespace) disagree, `logsdb_columnar` wins. Patterns without
 * any data stream are left out of the map.
 */
export async function getDataStreamIndexModes(
  esClient: ElasticsearchClient,
  indexPatterns: Map<string, string>
): Promise<Map<string, string | undefined>> {
  const entries = await pMap(
    [...indexPatterns],
    async ([templateName, indexPattern]) => {
      const res = await esClient.indices.getDataStream(
        { name: indexPattern, expand_wildcards: ['open', 'hidden'] },
        { ignore: [404] }
      );
      const modes: Array<string | undefined> = (res?.data_streams ?? []).map(
        (dataStream) => dataStream.indices?.at(-1)?.index_mode ?? dataStream.index_mode
      );
      if (modes.length === 0) {
        return undefined;
      }
      return [
        templateName,
        modes.includes(LOGSDB_COLUMNAR_INDEX_MODE) ? LOGSDB_COLUMNAR_INDEX_MODE : modes[0],
      ] as const;
    },
    { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
  );

  return new Map(entries.filter((entry) => entry !== undefined));
}

/**
 * Whether a logs index template of the installation currently carries the `logsdb_columnar`
 * index mode. Without a stored user choice, this is the only way to tell whether the package
 * defaults put the installation on columnar.
 */
export async function isLogsdbColumnarActive(
  esClient: ElasticsearchClient,
  installedEs: EsAssetReference[] = []
): Promise<boolean> {
  const templateNames = installedEs
    .filter(
      ({ type, id }) =>
        type === ElasticsearchAssetType.indexTemplate &&
        // Hidden data streams have their index template named `.logs-<dataset>`.
        (id.startsWith('logs-') || id.startsWith('.logs-'))
    )
    .map(({ id }) => id);
  if (templateNames.length === 0) {
    return false;
  }
  const currentIndexModes = await getCurrentIndexModes(esClient, templateNames);
  return [...currentIndexModes.values()].includes(LOGSDB_COLUMNAR_INDEX_MODE);
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
  packageInfo: ColumnarPackageInfo & {
    name: string;
    version: string;
    data_streams?: RegistryDataStream[];
  };
  dataStreams: RegistryDataStream[];
  installedPkg?: Installation;
}): Promise<Map<string, string | undefined>> {
  const isNewInstall = !installedPkg;
  const userChoice = installedPkg?.logsdb_columnar_enabled;

  const logsDataStreams = dataStreams.filter((dataStream) => dataStream.type === 'logs');
  if (logsDataStreams.length === 0) {
    return new Map();
  }
  // Judged on every data stream of the package, not only the ones being installed.
  const isIntegrationReady =
    getLogsdbColumnarNotReadyDataStreams(packageInfo, packageInfo.data_streams ?? dataStreams)
      .length === 0;

  // The current mode only matters for an existing installation: a fresh install has no index
  // templates to preserve a mode from, and nothing to move back to LogsDB either.
  const currentIndexModes =
    !isNewInstall && esClient
      ? await getCurrentIndexModes(
          esClient,
          logsDataStreams.map((dataStream) => getRegistryDataStreamAssetBaseName(dataStream))
        )
      : new Map<string, string | undefined>();

  // A data stream can exist without its index template, for example when a failed install
  // removed the templates before retrying: its write index tells which mode it is on, so that the
  // retry does not take it for a new data stream and move it back to LogsDB.
  if (!isNewInstall && esClient) {
    const missingTemplates = new Map(
      logsDataStreams
        .filter(
          (dataStream) => !currentIndexModes.has(getRegistryDataStreamAssetBaseName(dataStream))
        )
        .map((dataStream) => [
          getRegistryDataStreamAssetBaseName(dataStream),
          generateTemplateIndexPattern(dataStream),
        ])
    );
    if (missingTemplates.size > 0) {
      for (const [templateName, mode] of await getDataStreamIndexModes(
        esClient,
        missingTemplates
      )) {
        currentIndexModes.set(templateName, mode);
      }
    }
  }

  const resolved = new Map<string, string | undefined>();
  // Only looked up when a `default` data stream is new to an existing installation without a
  // user choice: it then follows what the installation already uses.
  let installationUsesColumnar: boolean | undefined;

  for (const dataStream of logsDataStreams) {
    const templateName = getRegistryDataStreamAssetBaseName(dataStream);
    const readiness = getLogsdbColumnarReadiness(packageInfo, dataStream);
    const currentIndexMode = currentIndexModes.get(templateName);

    // The data stream is on columnar today but the new package version no longer declares it
    // ready (explicitly `unsupported`, or the readiness was dropped altogether). Fleet removes
    // the mode and the data stream goes back to LogsDB at the next rollover, so say why.
    if (currentIndexMode === LOGSDB_COLUMNAR_INDEX_MODE && !isLogsdbColumnarReady(readiness)) {
      const reason =
        readiness === 'unsupported'
          ? 'is marked unsupported for logsdb_columnar'
          : 'no longer declares logsdb_columnar readiness';
      logger?.warn(
        `${templateName} ${reason} in ${packageInfo.name} ${packageInfo.version}; it moves back to LogsDB at the next rollover`
      );
    }

    // Without an ES client the current templates are unknown: treat every data stream as
    // existing so that none of them flips.
    const isNewDataStream =
      !isNewInstall && esClient !== undefined && !currentIndexModes.has(templateName);
    if (
      isNewDataStream &&
      esClient &&
      userChoice === undefined &&
      readiness === 'default' &&
      installationUsesColumnar === undefined
    ) {
      installationUsesColumnar =
        [...currentIndexModes.values()].includes(LOGSDB_COLUMNAR_INDEX_MODE) ||
        (await isLogsdbColumnarActive(esClient, installedPkg?.installed_es));
    }

    resolved.set(
      templateName,
      resolveLogsdbColumnarIndexMode({
        readiness,
        userChoice,
        isNewInstall,
        isIntegrationReady,
        isNewDataStream,
        installationUsesColumnar,
        currentIndexMode,
      })
    );
  }

  return resolved;
}
