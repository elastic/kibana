/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import deepEqual from 'fast-deep-equal';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  IndicesIndexSettings,
  IndicesIndexSettingsAnalysis,
  MappingDynamicTemplate,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';

import pMap from 'p-map';
import { isResponseError } from '@kbn/es-errors';

import {
  FLEET_EVENT_INGESTED_COMPONENT_TEMPLATE_NAME,
  OTEL_LOGS_COMPONENT_TEMPLATES,
  OTEL_METRICS_COMPONENT_TEMPLATES,
  OTEL_TRACES_COMPONENT_TEMPLATES,
  STACK_COMPONENT_TEMPLATE_LOGS_MAPPINGS,
} from '../../../../constants/fleet_es_assets';
import { MAX_CONCURRENT_DATASTREAM_OPERATIONS } from '../../../../constants';

import type { Field } from '../../fields/field';
import type {
  RegistryDataStream,
  IndexTemplateEntry,
  IndexTemplate,
  IndexTemplateMappings,
  PackageInfo,
  RegistryElasticsearch,
} from '../../../../types';
import { isOtelDataStream } from '../../packages/namespace_template_utils';
import { appContextService } from '../../..';
import { getRegistryDataStreamAssetBaseName } from '../../../../../common/services';
import {
  STACK_COMPONENT_TEMPLATE_ECS_MAPPINGS,
  FLEET_GLOBALS_COMPONENT_TEMPLATE_NAME,
  FLEET_AGENT_ID_VERIFY_COMPONENT_TEMPLATE_NAME,
  STACK_COMPONENT_TEMPLATE_LOGS_SETTINGS,
  STACK_COMPONENT_TEMPLATE_METRICS_SETTINGS,
  STACK_COMPONENT_TEMPLATE_METRICS_TSDB_SETTINGS,
} from '../../../../constants';
import { getESAssetMetadata } from '../meta';
import { retryTransientEsErrors } from '../retry';
import { PackageESError, PackageInvalidArchiveError } from '../../../../errors';

import { isUserSettingsTemplate, fillConstantKeywordValues } from './utils';
import { MappingsBuilder } from './mappings_builder';
import { retryDataStreamUpdateOnClusterEventTimeout } from './retry_data_stream_update';

export interface IndexTemplateMapping {
  [key: string]: any;
}
export interface CurrentDataStream {
  dataStreamName: string;
  replicated: boolean;
  indexTemplate: IndexTemplate;
  currentWriteIndex: string;
}

// see discussion in https://github.com/elastic/kibana/issues/88307
const DEFAULT_TEMPLATE_PRIORITY = 200;
const DATASET_IS_PREFIX_TEMPLATE_PRIORITY = 150;

// Namespace-scoped templates get a higher priority so ES picks them over
// the base template for data streams belonging to that namespace.
export const NAMESPACE_TEMPLATE_PRIORITY_BOOST = 50;

/**
 * getTemplate retrieves the default template but overwrites the index pattern with the given value.
 *
 * @param indexPattern String with the index pattern
 */
export function getTemplate({
  templateIndexPattern,
  packageName,
  composedOfTemplates,
  templatePriority,
  hidden,
  registryElasticsearch,
  isIndexModeTimeSeries,
  indexMode,
  type,
  isOtelInputType,
}: {
  templateIndexPattern: string;
  packageName: string;
  composedOfTemplates: string[];
  templatePriority: number;
  type: string;
  hidden?: boolean;
  registryElasticsearch?: RegistryElasticsearch | undefined;
  isIndexModeTimeSeries?: boolean;
  indexMode?: string;
  isOtelInputType?: boolean;
}): IndexTemplate {
  const template = getBaseTemplate({
    templateIndexPattern,
    packageName,
    composedOfTemplates,
    templatePriority,
    registryElasticsearch,
    hidden,
    isIndexModeTimeSeries,
    indexMode,
  });
  if (template.template.settings.index.final_pipeline) {
    throw new PackageInvalidArchiveError(
      `Error template for ${templateIndexPattern} contains a final_pipeline`
    );
  }

  const esBaseComponents = getBaseEsComponents(type, !!isIndexModeTimeSeries, isOtelInputType);
  const config = appContextService.getConfig();

  template.composed_of = [
    ...esBaseComponents,
    ...(template.composed_of || []),
    ...(isOtelInputType ? [] : [STACK_COMPONENT_TEMPLATE_ECS_MAPPINGS]),
    FLEET_GLOBALS_COMPONENT_TEMPLATE_NAME,
    ...(config?.agentIdVerificationEnabled ? [FLEET_AGENT_ID_VERIFY_COMPONENT_TEMPLATE_NAME] : []),
    ...(!config?.agentIdVerificationEnabled && config?.eventIngestedEnabled
      ? [FLEET_EVENT_INGESTED_COMPONENT_TEMPLATE_NAME]
      : []),
  ];

  template.ignore_missing_component_templates = template.composed_of.filter(isUserSettingsTemplate);
  return template;
}

const getBaseEsComponents = (
  type: string,
  isIndexModeTimeSeries: boolean,
  isOTelInputType?: boolean
): string[] => {
  if (isOTelInputType) {
    return getOtelBaseComponents(type);
  }

  if (type === 'metrics') {
    if (isIndexModeTimeSeries) {
      return [STACK_COMPONENT_TEMPLATE_METRICS_TSDB_SETTINGS];
    }

    return [STACK_COMPONENT_TEMPLATE_METRICS_SETTINGS];
  } else if (type === 'logs') {
    return [STACK_COMPONENT_TEMPLATE_LOGS_MAPPINGS, STACK_COMPONENT_TEMPLATE_LOGS_SETTINGS];
  }

  return [];
};

const getOtelBaseComponents = (type: string): string[] => {
  if (type === 'metrics') {
    return OTEL_METRICS_COMPONENT_TEMPLATES;
  } else if (type === 'logs') {
    return OTEL_LOGS_COMPONENT_TEMPLATES;
  } else if (type === 'traces') {
    return OTEL_TRACES_COMPONENT_TEMPLATES;
  }
  return [];
};

/**
 * Generate mapping takes the given nested fields array and creates the Elasticsearch
 * mapping properties out of it.
 *
 * This assumes that all fields with dotted.names have been expanded in a previous step.
 *
 * `isIndexModeColumnar` must be true when the resolved index mode is `columnar` or
 * `logsdb_columnar`; it gates the per-field `columnar` overrides (package-spec 3.7.0).
 */
export function generateMappings(
  fields: Field[],
  isIndexModeTimeSeries = false,
  isIndexModeColumnar = false
): IndexTemplateMappings {
  const builder = new MappingsBuilder(isIndexModeTimeSeries, isIndexModeColumnar);
  const { properties } = builder.build(fields);
  return builder.toIndexTemplateMappings(properties);
}

/**
 * Generates the template name out of the given information
 */
export function generateTemplateName(dataStream: RegistryDataStream): string {
  return getRegistryDataStreamAssetBaseName(dataStream);
}

/**
 * Given a data stream name, return the indexTemplate name
 */
async function getIndexTemplate(
  esClient: ElasticsearchClient,
  dataStreamName: string
): Promise<string> {
  const dataStream = await esClient.indices.getDataStream({
    name: dataStreamName,
    expand_wildcards: ['open', 'hidden'],
  });
  return dataStream.data_streams[0].template;
}

const buildIndexPattern = (baseName: string, isPrefix: boolean, tail: string): string =>
  isPrefix ? `${baseName}.*-${tail}` : `${baseName}-${tail}`;

export function generateTemplateIndexPattern(
  dataStream: RegistryDataStream,
  isOtelInputType?: boolean
): string {
  // See also https://github.com/elastic/package-spec/pull/102
  return buildIndexPattern(
    getRegistryDataStreamAssetBaseName(dataStream, isOtelInputType),
    !!dataStream.dataset_is_prefix,
    '*'
  );
}

// Template priorities are discussed in https://github.com/elastic/kibana/issues/88307
// See also https://www.elastic.co/guide/en/elasticsearch/reference/current/index-templates.html
//
// Built-in templates like logs-*-* and metrics-*-* have priority 100
//
// EPM generated templates for data streams have priority 200 (DEFAULT_TEMPLATE_PRIORITY)
//
// EPM generated templates for data streams with dataset_is_prefix: true have priority 150 (DATASET_IS_PREFIX_TEMPLATE_PRIORITY)

export function getTemplatePriority(dataStream: RegistryDataStream): number {
  // undefined or explicitly set to false
  // See also https://github.com/elastic/package-spec/pull/102
  if (!dataStream.dataset_is_prefix) {
    return DEFAULT_TEMPLATE_PRIORITY;
  } else {
    return DATASET_IS_PREFIX_TEMPLATE_PRIORITY;
  }
}

// ---------------------------------------------------------------------------
// Namespace-scoped index template helpers
// ---------------------------------------------------------------------------

/**
 * Returns the index template name for a namespace-scoped template.
 * Example: `logs-nginx.access@namespace.production`
 */
export function generateNamespaceTemplateName(baseName: string, namespace: string): string {
  return `${baseName}@namespace.${namespace}`;
}

/**
 * Returns the index pattern for a namespace-scoped template.
 *
 * The pattern matches the data stream name exactly (no trailing wildcard on the
 * namespace segment) so that namespaces with shared prefixes do not collide —
 * e.g. the template for namespace `production` must not also match data streams
 * for `production_eu` or `production_us`.
 *
 * Example (non-prefix): `logs-nginx.access-production`
 * Example (dataset_is_prefix): `metrics-test.*-production`
 * Example (OTel): `traces-generic.otel-production`
 */
export function generateNamespaceTemplateIndexPattern(
  dataStream: RegistryDataStream,
  namespace: string,
  isOtelInputType?: boolean
): string {
  return buildIndexPattern(
    getRegistryDataStreamAssetBaseName(dataStream, isOtelInputType),
    !!dataStream.dataset_is_prefix,
    namespace
  );
}

/**
 * Returns the priority for a namespace-scoped index template.
 * Always higher than the base template so ES picks it for matching data streams.
 *
 * Note: for data streams with `dataset_is_prefix: true`, the base template priority is 150
 * and the namespace template priority is 200 — the same numeric value as a regular base
 * template. This is intentional: Elasticsearch resolves priority ties by index pattern
 * specificity, so the more specific namespace pattern (e.g. `metrics-test.*-production`)
 * wins over the regular base pattern (e.g. `metrics-test.*-*`) even at equal priority.
 */
export function getNamespaceTemplatePriority(dataStream: RegistryDataStream): number {
  return getTemplatePriority(dataStream) + NAMESPACE_TEMPLATE_PRIORITY_BOOST;
}

/**
 * Returns true if the given template ID is a namespace-scoped index template,
 * identifiable by the `@namespace.` discriminator in the name.
 */
export function isNamespaceTemplate(id: string): boolean {
  return id.includes('@namespace.');
}

/**
 * Extracts the namespace from a namespace-scoped template ID.
 * Returns undefined if the ID is not a namespace template.
 * Example: `logs-nginx.access@namespace.production` → `'production'`
 */
export function getNamespaceFromTemplateId(id: string): string | undefined {
  const marker = '@namespace.';
  const idx = id.indexOf(marker);
  if (idx === -1) {
    return undefined;
  }
  return id.slice(idx + marker.length);
}

/**
 * Returns a map of the data stream path fields to elasticsearch index pattern.
 * @param dataStreams an array of RegistryDataStream objects
 * @param packageInfo package context used to detect OTel input data streams, which carry a
 * `.otel` dataset suffix. Callers that omit it get unsuffixed patterns.
 */
export function generateESIndexPatterns(
  dataStreams: RegistryDataStream[] | undefined,
  packageInfo?: Pick<PackageInfo, 'policy_templates'>
): Record<string, string> {
  if (!dataStreams) {
    return {};
  }

  const patterns: Record<string, string> = {};
  for (const dataStream of dataStreams) {
    patterns[dataStream.path] = generateTemplateIndexPattern(
      dataStream,
      packageInfo ? isOtelDataStream(dataStream, packageInfo) : undefined
    );
  }
  return patterns;
}

function getBaseTemplate({
  templateIndexPattern,
  packageName,
  composedOfTemplates,
  templatePriority,
  hidden,
  registryElasticsearch,
  isIndexModeTimeSeries,
  indexMode,
}: {
  templateIndexPattern: string;
  packageName: string;
  composedOfTemplates: string[];
  templatePriority: number;
  hidden?: boolean;
  registryElasticsearch: RegistryElasticsearch | undefined;
  isIndexModeTimeSeries?: boolean;
  indexMode?: string;
}): IndexTemplate {
  const _meta = getESAssetMetadata({ packageName });

  let settingsIndex = {};
  if (isIndexModeTimeSeries) {
    settingsIndex = {
      mode: 'time_series',
    };
  } else if (indexMode) {
    settingsIndex = {
      mode: indexMode,
    };
  }

  return {
    priority: templatePriority,
    index_patterns: [templateIndexPattern],
    template: {
      settings: {
        index: settingsIndex,
      },
      mappings: {
        _meta,
      },
    },
    data_stream: {
      hidden: registryElasticsearch?.['index_template.data_stream']?.hidden || hidden,
    },
    composed_of: composedOfTemplates,
    _meta,
  };
}

export const updateCurrentWriteIndices = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  templates: IndexTemplateEntry[],
  options?: {
    ignoreMappingUpdateErrors?: boolean;
    skipDataStreamRollover?: boolean;
    rolloverOnIndexModeReset?: boolean;
  }
): Promise<void> => {
  if (!templates.length) return;

  const allIndices = await queryDataStreamsFromTemplates(esClient, templates);
  const allUpdatablesIndices = allIndices.filter((indice) => {
    if (indice.replicated) {
      logger.warn(
        `Datastream ${indice.dataStreamName} cannot be updated because this is a replicated datastream.`
      );
      return false;
    }
    return true;
  });
  if (!allUpdatablesIndices.length) return;
  return updateAllDataStreams(allUpdatablesIndices, esClient, logger, options);
};

function isCurrentDataStream(item: CurrentDataStream[] | undefined): item is CurrentDataStream[] {
  return item !== undefined;
}

const queryDataStreamsFromTemplates = async (
  esClient: ElasticsearchClient,
  templates: IndexTemplateEntry[]
): Promise<CurrentDataStream[]> => {
  const concurrency =
    appContextService.getConfig()?.packageInstallation?.maxConcurrentDatastreamOperations ??
    MAX_CONCURRENT_DATASTREAM_OPERATIONS;
  const dataStreamObjects = await pMap(
    templates,
    (template) => {
      return getDataStreams(esClient, template);
    },
    {
      concurrency,
    }
  );
  return dataStreamObjects.filter(isCurrentDataStream).flat();
};

const getDataStreams = async (
  esClient: ElasticsearchClient,
  template: IndexTemplateEntry
): Promise<CurrentDataStream[] | undefined> => {
  const { indexTemplate } = template;

  const body = await esClient.indices.getDataStream({
    name: indexTemplate.index_patterns.join(','),
    expand_wildcards: ['open', 'hidden'],
  });

  const dataStreams = body.data_streams;
  if (!dataStreams.length) return;
  return dataStreams.map((dataStream: any) => ({
    dataStreamName: dataStream.name,
    replicated: dataStream.replicated,
    indexTemplate,
    currentWriteIndex: dataStream.indices?.at(-1)?.index_name,
  }));
};

// Index modes that Fleet can enable per data stream through experimental features; they are
// only ever present on a write index because a toggle or the package manifest put them there.
const TOGGLEABLE_INDEX_MODES: string[] = ['time_series', 'logsdb_columnar', 'columnar'];

const MAPPER_EXCEPTION_REASONS_REQUIRING_ROLLOVER = [
  'subobjects',
  "[enabled] parameter can't be updated for the object mapping",
];

/**
 * `mapper_parsing_exception` is ES's generic "this mapping is invalid" error, so only the
 * reasons below are treated as rollover-worthy.  Both are caused by analysis settings
 * (analyzers, normalizers) being immutable after index creation: the referenced analyzer is
 * defined in the composed index template but not in the current write index's settings, so only
 * a new backing index can pick it up.  This typically happens when a `@custom` component
 * template gains a custom analyzer after the write index was created.
 *
 * Each pattern captures the kind and the name of the offending analysis component so that the
 * composed index template can be checked for it before a rollover is scheduled.
 */
const MAPPER_PARSING_EXCEPTION_REASONS_REQUIRING_ROLLOVER = [
  // (search_)analyzer [standard_lower] has not been configured in mappings
  /(analyzer|normalizer) \[([^\]]+)\] has not been configured in mappings/,
  // normalizer [uppercase_normalizer] not found for field [name]
  /(analyzer|normalizer) \[([^\]]+)\] not found for field/,
];

/**
 * Collects every `reason` string from an ES error body, walking the `caused_by` chain and
 * `root_cause` entries, as ES often nests the actionable message below the top level.
 */
const collectErrorReasons = (err: any): string[] => {
  const reasons: string[] = [];
  const visit = (error: any) => {
    if (!error || typeof error !== 'object') {
      return;
    }
    if (typeof error.reason === 'string') {
      reasons.push(error.reason);
    }
    visit(error.caused_by);
    if (Array.isArray(error.root_cause)) {
      error.root_cause.forEach(visit);
    }
  };
  visit(err?.body?.error);
  return reasons;
};

const errorReasonRequiresRollover = (err: any, reasonsRequiringRollover: string[]): boolean => {
  const reasons = collectErrorReasons(err);
  return reasonsRequiringRollover.some((reasonRequiringRollover) =>
    reasons.some((reason) => reason.includes(reasonRequiringRollover))
  );
};

/**
 * Extracts the analyzer or normalizer that an ES mapping error complains about, or undefined
 * when the error is not about a missing analysis component.
 */
const getReferencedAnalysisComponent = (
  err: any
): { kind: 'analyzer' | 'normalizer'; name: string } | undefined => {
  for (const reason of collectErrorReasons(err)) {
    for (const pattern of MAPPER_PARSING_EXCEPTION_REASONS_REQUIRING_ROLLOVER) {
      const match = reason.match(pattern);
      if (match) {
        // `search_analyzer [x]` also matches the `analyzer` alternative, which is correct as its
        // value is resolved from `analysis.analyzer` too.
        return { kind: match[1] as 'analyzer' | 'normalizer', name: match[2] };
      }
    }
  }
};

/**
 * Returns true when the ES error indicates that the mapping change is incompatible with the
 * current write index and a data-stream rollover is the right recovery action.
 *
 * `total_fields` limit breaches are deliberately excluded: they surface as
 * `illegal_argument_exception` but a rollover cannot fix them — the new write index is built
 * from the same index template and inherits the same field-count limit, so the oversized
 * mapping would fail again immediately.  Callers should surface those errors clearly instead.
 *
 * `mapper_exception` and `mapper_parsing_exception` are matched against an allowlist of reasons
 * rather than by type alone: both types also cover genuinely invalid mappings, and a rollover
 * here swallows the error and reports the install as successful, so matching them
 * unconditionally would hide real packaging bugs.
 *
 * `simulatedAnalysis` is the `index.analysis` section of the composed index template, and is
 * undefined when the template could not be simulated at all.  A `mapper_parsing_exception` is
 * only rollover-worthy when the analyzer it names is actually present there, as that is what
 * the new backing index will be built from.
 */
function errorNeedRollover(err: any, simulatedAnalysis?: IndicesIndexSettingsAnalysis): boolean {
  if (
    isResponseError(err) &&
    err.statusCode === 400 &&
    err.body?.error?.type === 'illegal_argument_exception'
  ) {
    // total_fields limit errors cannot be resolved by a rollover — skip them.
    if (isTotalFieldsLimitError(err)) {
      return false;
    }
    return true;
  }
  if (
    err.body?.error?.type === 'mapper_exception' &&
    errorReasonRequiresRollover(err, MAPPER_EXCEPTION_REASONS_REQUIRING_ROLLOVER)
  ) {
    return true;
  }
  if (err.body?.error?.type === 'mapper_parsing_exception') {
    const referenced = getReferencedAnalysisComponent(err);
    // If the analyzer is missing from the composed template too — or the template could not be
    // simulated — the next backing index would be built from the same broken definition, so the
    // error has to surface instead of being masked by a rollover.
    return Boolean(referenced && simulatedAnalysis?.[referenced.kind]?.[referenced.name]);
  }
  return false;
}

/**
 * Returns true when the error is an ES `total_fields` limit breach
 * (`index.mapping.total_fields.limit` exceeded).
 */
export function isTotalFieldsLimitError(err: any): boolean {
  const reason: string = err.body?.error?.reason ?? '';
  return reason.includes('Limit of total fields') && reason.includes('has been exceeded');
}

const rolloverDataStream = (
  dataStreamName: string,
  esClient: ElasticsearchClient,
  logger: Logger
) => {
  return retryDataStreamUpdateOnClusterEventTimeout(
    () =>
      esClient.transport.request({
        method: 'POST',
        path: `/${dataStreamName}/_rollover`,
        querystring: {
          lazy: true,
        },
      }),
    { logger, dataStreamName }
  );
};

const updateAllDataStreams = async (
  indexNameWithTemplates: CurrentDataStream[],
  esClient: ElasticsearchClient,
  logger: Logger,
  options?: {
    ignoreMappingUpdateErrors?: boolean;
    skipDataStreamRollover?: boolean;
    rolloverOnIndexModeReset?: boolean;
  }
): Promise<void> => {
  const concurrency =
    appContextService.getConfig()?.packageInstallation?.maxConcurrentDatastreamOperations ??
    MAX_CONCURRENT_DATASTREAM_OPERATIONS;
  await pMap(
    indexNameWithTemplates,
    (templateEntry) => {
      return updateExistingDataStream({
        esClient,
        logger,
        currentWriteIndex: templateEntry.currentWriteIndex,
        dataStreamName: templateEntry.dataStreamName,
        options,
      });
    },
    {
      concurrency,
    }
  );
};

const updateExistingDataStream = async ({
  dataStreamName,
  currentWriteIndex,
  esClient,
  logger,
  options,
}: {
  dataStreamName: string;
  currentWriteIndex: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  options?: {
    ignoreMappingUpdateErrors?: boolean;
    skipDataStreamRollover?: boolean;
    rolloverOnIndexModeReset?: boolean;
  };
}) => {
  const existingDs = await esClient.indices.get({
    index: currentWriteIndex,
  });

  const existingDsConfig = Object.values(existingDs);
  const currentBackingIndexConfig = existingDsConfig.at(-1);
  const currentIndexMode = currentBackingIndexConfig?.settings?.index?.mode;
  const currentSourceType = currentBackingIndexConfig?.settings?.index?.mapping?.source?.mode;

  let settings: IndicesIndexSettings;
  let mappings: MappingTypeMapping = {};
  let lifecycle: any;
  let subobjectsFieldChanged: boolean = false;
  let simulateResult: any = {};
  // Stays undefined if the template cannot be simulated, which `errorNeedRollover` relies on to
  // tell a failed simulation apart from a failed mappings update.
  let simulatedAnalysis: IndicesIndexSettingsAnalysis | undefined;
  try {
    simulateResult = await retryTransientEsErrors(async () =>
      esClient.indices.simulateTemplate({
        name: await getIndexTemplate(esClient, dataStreamName),
      })
    );

    settings = simulateResult.template.settings;
    simulatedAnalysis = settings?.index?.analysis;

    try {
      mappings = fillConstantKeywordValues(
        currentBackingIndexConfig?.mappings || {},
        simulateResult.template.mappings || {}
      );
    } catch (err) {
      logger.error(`Error filling constant keyword values: ${err}`);
      mappings = simulateResult.template.mappings;
    }

    lifecycle = simulateResult.template.lifecycle;

    // for now, remove from object so as not to update stream or data stream properties of the index until type and name
    // are added in https://github.com/elastic/kibana/issues/66551.  namespace value we will continue
    // to skip updating and assume the value in the index mapping is correct
    if (mappings && mappings.properties) {
      delete mappings.properties.stream;
      delete mappings.properties.data_stream;
    }
    if (currentBackingIndexConfig?.mappings?.subobjects !== mappings.subobjects) {
      subobjectsFieldChanged = true;
    }

    logger.debug(`Attempt to update the mappings for the ${dataStreamName} (write_index_only)`);
    await retryTransientEsErrors(
      () =>
        esClient.indices.putMapping({
          index: dataStreamName,
          ...mappings,
          write_index_only: true,
        }),
      { logger }
    );

    // if update fails, rollover data stream and bail out
  } catch (err) {
    if (errorNeedRollover(err, simulatedAnalysis) || subobjectsFieldChanged) {
      logger.info(`Mappings update for ${dataStreamName} failed due to ${err}`);
      logger.trace(`Attempted mappings: ${mappings}`);
      if (options?.skipDataStreamRollover === true) {
        logger.info(
          `Skipping rollover for ${dataStreamName} as "skipDataStreamRollover" is enabled`
        );
        return;
      } else {
        logger.info(`Triggering a rollover for ${dataStreamName}`);
        await rolloverDataStream(dataStreamName, esClient, logger);
        return;
      }
    }
    // total_fields limit errors cannot be resolved by a rollover (the new write index inherits
    // the same limit from the index template).  Log clearly and skip the rollover so we don't
    // add churn to an already-overloaded cluster.
    if (isTotalFieldsLimitError(err)) {
      logger.warn(
        `Mappings update for ${dataStreamName} failed because the index mapping total_fields limit has been exceeded. ` +
          `Skipping rollover as it would not resolve the issue. ` +
          `The total_fields limit must be raised on the index template to allow this mapping update: ${err}`
      );
      if (options?.ignoreMappingUpdateErrors !== true) {
        throw err;
      }
      return;
    }
    logger.error(`Mappings update for ${dataStreamName} failed due to unexpected error: ${err}`);
    logger.trace(`Attempted mappings: ${mappings}`);
    if (options?.ignoreMappingUpdateErrors === true) {
      logger.info(`Ignore mapping update errors as "ignoreMappingUpdateErrors" is enabled`);
      return;
    } else {
      throw err;
    }
  }

  const filterDimensionMappings = (
    templates?: Array<Record<string, MappingDynamicTemplate | undefined>>
  ) =>
    templates?.filter(
      (template) => (Object.values(template)[0]?.mapping as any)?.time_series_dimension
    ) ?? [];

  const currentDynamicDimensionMappings = filterDimensionMappings(
    currentBackingIndexConfig?.mappings?.dynamic_templates
  );
  const updatedDynamicDimensionMappings = filterDimensionMappings(mappings.dynamic_templates);

  const sortMappings = (
    a: Record<string, MappingDynamicTemplate | undefined>,
    b: Record<string, MappingDynamicTemplate | undefined>
  ) => Object.keys(a)[0].localeCompare(Object.keys(b)[0]);

  const dynamicDimensionMappingsChanged = !deepEqual(
    currentDynamicDimensionMappings.sort(sortMappings),
    updatedDynamicDimensionMappings.sort(sortMappings)
  );

  const packageDefinedIndexMode = settings?.index?.mode;
  const packageDefinedSourceMode = settings?.index?.mapping?.source?.mode;

  // When the template declares no mode the cluster default applies at index creation, so a
  // mismatch with the current write index is normal (e.g. logsdb by default) and must not roll
  // over. The exception is an explicit opt-out of a toggleable mode: the write index still has
  // the old mode while the template reset to the default, and only a rollover can switch it.
  const indexModeChanged =
    packageDefinedIndexMode !== undefined
      ? currentIndexMode !== packageDefinedIndexMode
      : options?.rolloverOnIndexModeReset === true &&
        currentIndexMode !== undefined &&
        TOGGLEABLE_INDEX_MODES.includes(currentIndexMode);

  // Trigger a rollover if the index mode or source type has changed
  if (
    indexModeChanged ||
    (packageDefinedSourceMode !== undefined &&
      currentSourceType !== settings?.index?.mapping?.source?.mode) ||
    dynamicDimensionMappingsChanged
  ) {
    if (options?.skipDataStreamRollover === true) {
      logger.info(
        `Index mode or source type or dynamic dimension mappings have changed for ${dataStreamName}, skipping rollover as "skipDataStreamRollover" is enabled`
      );
      return;
    } else {
      logger.info(
        dynamicDimensionMappingsChanged
          ? `Dynamic dimension mappings changed for ${dataStreamName}, triggering a rollover`
          : `Index mode or source type has changed for ${dataStreamName}, triggering a rollover`
      );
      await rolloverDataStream(dataStreamName, esClient, logger);
    }
  }

  if (lifecycle?.data_retention) {
    try {
      logger.debug(`Updating lifecycle for ${dataStreamName}`);

      await retryTransientEsErrors(
        () =>
          esClient.transport.request({
            method: 'PUT',
            path: `_data_stream/${dataStreamName}/_lifecycle`,
            body: { data_retention: lifecycle.data_retention },
          }),
        { logger }
      );
    } catch (err) {
      // Check if this error can happen because of invalid settings;
      // We are returning a 500 but in that case it should be a 400 instead
      throw new PackageESError(
        `Could not update lifecycle settings for ${dataStreamName}: ${err.message}`
      );
    }
  }

  // update settings after mappings was successful to ensure
  // pointing to the new pipeline is safe
  // for now, only update the pipeline
  if (!settings?.index?.default_pipeline) {
    return;
  }

  try {
    logger.debug(`Updating index settings of data stream  ${dataStreamName}`);

    await retryTransientEsErrors(
      () =>
        esClient.indices.putSettings({
          index: dataStreamName,
          settings: { default_pipeline: settings!.index!.default_pipeline },
        }),
      { logger }
    );
  } catch (err) {
    logger.error(`Error updating index settings of data stream ${dataStreamName}: ${err}`);
    // Same as above - Check if this error can happen because of invalid settings;
    // We are returning a 500 but in that case it should be a 400 instead
    throw new PackageESError(
      `Could not update index settings of data stream ${dataStreamName}: ${err.message}`
    );
  }
};
