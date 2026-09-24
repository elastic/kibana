/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { createErrorResult } from '@kbn/agent-builder-server';
import { MLCATEGORY } from '@kbn/ml-anomaly-utils';
import { parseInterval } from '@kbn/ml-parse-interval';
import type { ResolveMlCapabilities } from '@kbn/ml-common-types/capabilities';
import { VALIDATION_STATUS } from '@kbn/ml-validators';
import type { MlLicense } from '../../../common/license';
import type { MlFeatures } from '../../../common/constants/app';
import type { MlAuthorizationService } from '../../lib/capabilities/check_capabilities';
import { hasMlCapabilitiesProvider } from '../../lib/capabilities/check_capabilities';
import { validateJob } from '../../models/job_validation/job_validation';
import { previewDatafeedForValidation } from '../../models/job_validation/validate_datafeed_preview';
import { estimateBucketSpanFactory } from '../../models/bucket_span_estimator';
import { getMessages } from '../../../common/constants/messages';
import type { BuildMlClientFn, BuildDataRecognizerFn } from '../ml_client_factory';
import { AD_CREATE_JOB_TOOL_ID } from './tool_ids';

const schema = z.object({
  operation: z.enum([
    'validate_spec',
    'estimate_memory',
    'create_job',
    'create_datafeed',
    'validate_full',
    'preview_datafeed_config',
    'estimate_bucket_span',
    'recognize_modules',
    'get_module',
  ]),
  job_id: z.string().optional().describe('Job ID. Required for create_job and create_datafeed.'),
  job_config: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Full job configuration body. Required for create_job, validate_spec, estimate_memory, validate_full, and preview_datafeed_config.'
    ),
  datafeed_config: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Full datafeed configuration body. Required for create_datafeed, validate_full, and preview_datafeed_config.'
    ),
  duration: z
    .object({
      start: z.number().optional().describe('Start epoch ms.'),
      end: z.number().optional().describe('End epoch ms.'),
    })
    .optional()
    .describe(
      'Time range in epoch ms. Scopes estimate_memory cardinality lookups to the explored or batch window, skips the internal time-range lookup in validate_full, and scopes the datafeed preview.'
    ),
  estimator_params: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Bucket span estimator parameters. Required for estimate_bucket_span. Must include index, aggTypes, fields, duration {start, end}. Optionally timeField, splitField, query.'
    ),
  index_pattern: z
    .string()
    .optional()
    .describe('Index pattern to match against installed modules. Required for recognize_modules.'),
  module_id: z.string().optional().describe('Module ID to retrieve. Required for get_module.'),
  module_tag_filters: z
    .array(z.string())
    .optional()
    .describe(
      'Optional tag filters for recognize_modules and get_module (e.g. ["security", "observability"]).'
    ),
  include_configs: z
    .boolean()
    .optional()
    .describe(
      'For get_module: return full job and datafeed configs. Default false returns a slim projection (id, detectors, bucket_span, influencers) to avoid large context.'
    ),
});

export const createAdCreateJobTool = (
  resolveMlCapabilities: ResolveMlCapabilities,
  authorization?: MlAuthorizationService,
  mlLicense?: MlLicense,
  enabledFeatures?: MlFeatures,
  buildMlClient?: BuildMlClientFn,
  buildDataRecognizer?: BuildDataRecognizerFn
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: AD_CREATE_JOB_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Discover OOTB job recipes, validate an unsaved job config (including full datafeed preview and cardinality checks), preview datafeed documents, estimate bucket span, and create the job and datafeed once validation passes.',
  experimental: true,
  schema,
  handler: async (
    {
      operation,
      job_id: jobId,
      job_config: jobConfig,
      datafeed_config: datafeedConfig,
      duration,
      estimator_params: estimatorParams,
      index_pattern: indexPattern,
      module_id: moduleId,
      module_tag_filters: moduleTagFilters,
      include_configs: includeConfigs,
    },
    { esClient, savedObjectsClient, request }
  ) => {
    const hasMlCapabilities = hasMlCapabilitiesProvider(
      resolveMlCapabilities,
      request,
      authorization,
      mlLicense,
      enabledFeatures
    );
    const ml = esClient.asCurrentUser.ml;

    try {
      switch (operation) {
        case 'validate_spec': {
          await hasMlCapabilities(['canCreateJob']);
          if (!jobConfig) {
            return {
              results: [createErrorResult('job_config is required for validate_spec')],
            };
          }
          const response = await ml.validate({ body: jobConfig as any });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'estimate_memory': {
          await hasMlCapabilities(['canCreateJob']);
          if (!jobConfig) {
            return {
              results: [createErrorResult('job_config is required for estimate_memory')],
            };
          }
          // estimateModelMemory only accepts analysis_config, overall_cardinality, max_bucket_cardinality
          const jobConfigObj = jobConfig as Record<string, unknown>;
          const { analysis_config, overall_cardinality, max_bucket_cardinality } = jobConfigObj;
          if (!analysis_config) {
            return {
              results: [
                createErrorResult('job_config.analysis_config is required for estimate_memory'),
              ],
            };
          }

          const analysisConfigObj = analysis_config as Record<string, unknown>;
          const detectors = Array.isArray(analysisConfigObj.detectors)
            ? (analysisConfigObj.detectors as Array<Record<string, unknown>>)
            : [];

          // `_estimate_model_memory` wants overall cardinality for by/over/partition
          // fields, and max-bucket cardinality only for influencers that are not
          // already covered by those detector fields. `mlcategory` is produced by
          // categorization and has no cardinality in the source data.
          const overallCardinalityFields = collectOverallCardinalityFields(detectors);
          const influencerCardinalityFields = collectInfluencerCardinalityFields(
            analysisConfigObj.influencers,
            overallCardinalityFields
          );

          // Auto-fetch cardinality from source indices when split fields are present
          // and cardinality was not explicitly provided by the caller
          let resolvedOverallCardinality = overall_cardinality as
            | Record<string, number>
            | undefined;
          let resolvedMaxBucketCardinality = max_bucket_cardinality as
            | Record<string, number>
            | undefined;

          const datafeedConfigObj = datafeedConfig as Record<string, unknown> | undefined;
          const indices =
            datafeedConfigObj && Array.isArray(datafeedConfigObj.indices)
              ? (datafeedConfigObj.indices as string[])
              : undefined;
          const datafeedQuery = getDatafeedQuery(datafeedConfigObj);
          const dataDesc = jobConfigObj.data_description as Record<string, unknown> | undefined;
          const timeField =
            typeof dataDesc?.time_field === 'string' ? dataDesc.time_field : '@timestamp';
          const bucketSpan =
            typeof analysisConfigObj.bucket_span === 'string'
              ? analysisConfigObj.bucket_span
              : '15m';
          const cardinalityQuery = buildCardinalityQuery(datafeedQuery, timeField, duration);

          if (indices && indices.length > 0) {
            if (overallCardinalityFields.size > 0 && !resolvedOverallCardinality) {
              resolvedOverallCardinality = {};
              for (const field of overallCardinalityFields) {
                try {
                  const result = await esClient.asCurrentUser.search({
                    index: indices,
                    size: 0,
                    ...(cardinalityQuery ? { query: cardinalityQuery } : {}),
                    aggs: { card: { cardinality: { field } } },
                  });
                  const cardinality = (result.aggregations?.card as { value?: number } | undefined)
                    ?.value;
                  if (typeof cardinality !== 'number') {
                    return {
                      results: [
                        createErrorResult(
                          `Cannot estimate memory: cardinality aggregation for field "${field}" was missing from the source search.`
                        ),
                      ],
                    };
                  }
                  resolvedOverallCardinality[field] = cardinality;
                } catch (err) {
                  const message = err instanceof Error ? err.message : String(err);
                  return {
                    results: [
                      createErrorResult(
                        `Cannot estimate memory: failed to look up cardinality for field "${field}": ${message}`
                      ),
                    ],
                  };
                }
              }
            }

            if (influencerCardinalityFields.size > 0 && !resolvedMaxBucketCardinality) {
              if (duration?.start === undefined && duration?.end === undefined) {
                return {
                  results: [
                    createErrorResult(
                      'Cannot estimate memory: duration {start, end} is required so max-bucket cardinality stays inside the explored or batch time range.'
                    ),
                  ],
                };
              }
              resolvedMaxBucketCardinality = {};
              const histogramQuery = buildCardinalityQuery(
                datafeedQuery,
                timeField,
                duration,
                bucketSpan
              );

              for (const field of influencerCardinalityFields) {
                try {
                  const result = await esClient.asCurrentUser.search({
                    index: indices,
                    size: 0,
                    ...(histogramQuery ? { query: histogramQuery } : {}),
                    aggs: {
                      buckets: {
                        date_histogram: { field: timeField, fixed_interval: bucketSpan },
                        aggs: { card: { cardinality: { field } } },
                      },
                      max_bucket_card: { max_bucket: { buckets_path: 'buckets>card' } },
                    },
                  });
                  if (!result.aggregations?.max_bucket_card) {
                    return {
                      results: [
                        createErrorResult(
                          `Cannot estimate memory: max-bucket cardinality aggregation for field "${field}" was missing from the source search.`
                        ),
                      ],
                    };
                  }
                  const maxBucketCardinality = (
                    result.aggregations.max_bucket_card as { value?: number | null }
                  ).value;
                  // max_bucket returns null when the histogram has no buckets (no source docs).
                  resolvedMaxBucketCardinality[field] = maxBucketCardinality ?? 0;
                } catch (err) {
                  const message = err instanceof Error ? err.message : String(err);
                  return {
                    results: [
                      createErrorResult(
                        `Cannot estimate memory: failed to look up max-bucket cardinality for field "${field}": ${message}`
                      ),
                    ],
                  };
                }
              }
            }
          }

          const estimateBody = {
            analysis_config,
            ...(resolvedOverallCardinality
              ? { overall_cardinality: resolvedOverallCardinality }
              : {}),
            ...(resolvedMaxBucketCardinality
              ? { max_bucket_cardinality: resolvedMaxBucketCardinality }
              : {}),
          };
          const response = await ml.estimateModelMemory({ body: estimateBody as any });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'create_job': {
          await hasMlCapabilities(['canCreateJob']);
          if (!jobId || !jobConfig) {
            return {
              results: [createErrorResult('job_id and job_config are required for create_job')],
            };
          }
          const mlClient = buildMlClient?.(esClient, savedObjectsClient, request);
          if (mlClient) {
            // @ts-expect-error job config is passed as body at runtime
            const response = await mlClient.putJob({ job_id: jobId, body: jobConfig });
            return { results: [{ type: ToolResultType.other, data: response }] };
          }
          // fallback: no saved object created (pre-fix behaviour)
          // @ts-expect-error job config is passed as body at runtime
          const response = await ml.putJob({ job_id: jobId, body: jobConfig });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'create_datafeed': {
          await hasMlCapabilities(['canCreateDatafeed']);
          const datafeedId = jobId ? `datafeed-${jobId}` : undefined;
          if (!datafeedId || !datafeedConfig) {
            return {
              results: [
                createErrorResult('job_id and datafeed_config are required for create_datafeed'),
              ],
            };
          }
          // Ensure job_id is present in the body — the ES API requires it.
          // The explicit job_id argument is authoritative so a stale/hallucinated
          // datafeed_config.job_id cannot attach the datafeed to a different job.
          const enrichedDatafeedConfig = { ...datafeedConfig, job_id: jobId };
          const mlClient = buildMlClient?.(esClient, savedObjectsClient, request);
          if (mlClient) {
            const response = await mlClient.putDatafeed({
              datafeed_id: datafeedId,
              body: enrichedDatafeedConfig as any,
            });
            return { results: [{ type: ToolResultType.other, data: response }] };
          }
          // fallback: no saved object created (pre-fix behaviour)
          const response = await ml.putDatafeed({
            datafeed_id: datafeedId,
            body: enrichedDatafeedConfig as any,
          });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'validate_full': {
          await hasMlCapabilities(['canCreateJob']);
          if (!jobConfig || !datafeedConfig) {
            return {
              results: [
                createErrorResult('job_config and datafeed_config are required for validate_full'),
              ],
            };
          }
          const mlClient = buildMlClient?.(esClient, savedObjectsClient, request);
          if (!mlClient) {
            return {
              results: [createErrorResult('ML client is unavailable — service not yet started')],
            };
          }

          const combinedJob = { ...jobConfig, datafeed_config: datafeedConfig };
          const payload = {
            job: combinedJob,
            ...(duration ? { duration } : {}),
          };

          const isSecurityDisabled = mlLicense?.isSecurityEnabled() === false;
          const rawMessages = await validateJob(
            esClient,
            mlClient,
            payload as any,
            isSecurityDisabled
          );

          // Hydrate statuses from the message definitions (server-side, no docLinks needed)
          const messageDefinitions = getMessages();
          const hydratedMessages = rawMessages.map((msg) => {
            const def = messageDefinitions[msg.id as keyof typeof messageDefinitions] as
              | { status?: string; heading?: string; text?: string }
              | undefined;
            return {
              ...msg,
              status: def?.status ?? VALIDATION_STATUS.INFO,
            };
          });

          const blocking = hydratedMessages
            .filter((m) => m.status === VALIDATION_STATUS.ERROR)
            .map((m) => m.id);

          const overallStatus =
            blocking.length > 0
              ? VALIDATION_STATUS.ERROR
              : hydratedMessages.some((m) => m.status === VALIDATION_STATUS.WARNING)
              ? VALIDATION_STATUS.WARNING
              : VALIDATION_STATUS.SUCCESS;

          return {
            results: [
              {
                type: ToolResultType.other,
                data: { status: overallStatus, blocking, messages: hydratedMessages },
              },
            ],
          };
        }

        case 'preview_datafeed_config': {
          await hasMlCapabilities(['canPreviewDatafeed']);
          if (!jobConfig || !datafeedConfig) {
            return {
              results: [
                createErrorResult(
                  'job_config and datafeed_config are required for preview_datafeed_config'
                ),
              ],
            };
          }
          const mlClient = buildMlClient?.(esClient, savedObjectsClient, request);
          if (!mlClient) {
            return {
              results: [createErrorResult('ML client is unavailable — service not yet started')],
            };
          }

          const combinedJob = { ...jobConfig, datafeed_config: datafeedConfig };
          const preview = await previewDatafeedForValidation(
            mlClient,
            combinedJob as any,
            duration?.start,
            duration?.end
          );

          if (!preview.valid) {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: { valid: false, documentsFound: false, error: preview.error },
                },
              ],
            };
          }

          const documents = preview.documents.slice(0, 20);
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  valid: true,
                  documentsFound: documents.length > 0,
                  sample_documents: documents,
                },
              },
            ],
          };
        }

        case 'estimate_bucket_span': {
          await hasMlCapabilities(['canCreateJob']);
          if (!estimatorParams) {
            return {
              results: [createErrorResult('estimator_params is required for estimate_bucket_span')],
            };
          }
          const result = await estimateBucketSpanFactory(esClient)(estimatorParams as any).catch(
            (err: unknown) => ({
              error: true,
              message: err,
            })
          );
          return { results: [{ type: ToolResultType.other, data: result }] };
        }

        case 'recognize_modules': {
          await hasMlCapabilities(['canGetJobs']);
          if (!indexPattern) {
            return {
              results: [createErrorResult('index_pattern is required for recognize_modules')],
            };
          }
          if (!buildDataRecognizer) {
            return {
              results: [
                createErrorResult('Module recognition is unavailable — service not yet started'),
              ],
            };
          }
          const drForRecognize = await buildDataRecognizer(esClient, savedObjectsClient, request);
          if (!drForRecognize) {
            return {
              results: [
                createErrorResult('Module recognition is unavailable — service not yet started'),
              ],
            };
          }
          const matches = await drForRecognize.findMatches(indexPattern, moduleTagFilters);
          // Strip logo to avoid base64 token waste
          const strippedMatches = matches.map(({ logo: _logo, ...rest }) => rest);
          return { results: [{ type: ToolResultType.other, data: strippedMatches }] };
        }

        case 'get_module': {
          await hasMlCapabilities(['canGetJobs']);
          if (!moduleId) {
            return {
              results: [createErrorResult('module_id is required for get_module')],
            };
          }
          if (!buildDataRecognizer) {
            return {
              results: [
                createErrorResult('Module recognition is unavailable — service not yet started'),
              ],
            };
          }
          const drForGet = await buildDataRecognizer(esClient, savedObjectsClient, request);
          if (!drForGet) {
            return {
              results: [
                createErrorResult('Module recognition is unavailable — service not yet started'),
              ],
            };
          }
          const module = await drForGet.getModule(moduleId, moduleTagFilters);
          if (includeConfigs) {
            const { logo: _logo, ...fullModule } = module as unknown as Record<string, unknown>;
            return { results: [{ type: ToolResultType.other, data: fullModule }] };
          }
          // Slim projection: strip configs and logo to avoid token bloat
          const slim = projectModuleSlim(module as unknown as Record<string, unknown>);
          return { results: [{ type: ToolResultType.other, data: slim }] };
        }

        default:
          return {
            results: [createErrorResult(`Unknown operation: ${operation}`)],
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [createErrorResult(`Error executing ${operation}: ${message}`)],
      };
    }
  },
});

const isCardinalityField = (field: unknown): field is string =>
  typeof field === 'string' && field.length > 0 && field !== MLCATEGORY;

/** Detector split fields that `_estimate_model_memory` reads from `overall_cardinality`. */
const collectOverallCardinalityFields = (
  detectors: Array<Record<string, unknown>>
): Set<string> => {
  const fields = new Set<string>();
  for (const detector of detectors) {
    for (const fieldName of [
      detector.by_field_name,
      detector.over_field_name,
      detector.partition_field_name,
    ]) {
      if (isCardinalityField(fieldName)) {
        fields.add(fieldName);
      }
    }
  }
  return fields;
};

/**
 * Influencer fields that still need `max_bucket_cardinality`. Fields already
 * sent as overall cardinality are omitted, matching the job wizard estimator.
 */
const collectInfluencerCardinalityFields = (
  influencers: unknown,
  overallCardinalityFields: ReadonlySet<string>
): Set<string> => {
  const influencerList = Array.isArray(influencers)
    ? influencers
    : influencers === undefined
    ? []
    : [influencers];
  const fields = new Set<string>();
  for (const influencer of influencerList) {
    if (isCardinalityField(influencer) && !overallCardinalityFields.has(influencer)) {
      fields.add(influencer);
    }
  }
  return fields;
};

/** Datafeed query DSL, when present, so cardinality is measured on the filtered source. */
const getDatafeedQuery = (
  datafeedConfig: Record<string, unknown> | undefined
): estypes.QueryDslQueryContainer | undefined => {
  const query = datafeedConfig?.query;
  if (query === null || typeof query !== 'object' || Array.isArray(query)) {
    return undefined;
  }
  return query as estypes.QueryDslQueryContainer;
};

/** Matches the job-wizard estimator: a date histogram must stay under this many buckets. */
const MAX_CARDINALITY_HISTOGRAM_BUCKETS = 1000;

/**
 * Combines the datafeed query with the explored/batch time range.
 * When `bucketSpan` is set, the start is pulled forward so the date histogram
 * cannot exceed {@link MAX_CARDINALITY_HISTOGRAM_BUCKETS}.
 */
const buildCardinalityQuery = (
  datafeedQuery: estypes.QueryDslQueryContainer | undefined,
  timeField: string,
  duration: { start?: number; end?: number } | undefined,
  bucketSpan?: string
): estypes.QueryDslQueryContainer | undefined => {
  if (duration?.start === undefined && duration?.end === undefined) {
    return datafeedQuery;
  }

  let start = duration.start;
  const end = duration.end;
  if (bucketSpan !== undefined && end !== undefined) {
    const interval = parseInterval(bucketSpan);
    if (interval !== null) {
      const earliestAllowed = end - MAX_CARDINALITY_HISTOGRAM_BUCKETS * interval.asMilliseconds();
      start = start === undefined ? earliestAllowed : Math.max(start, earliestAllowed);
    }
  }

  const bounds: estypes.QueryDslRangeQuery = { format: 'epoch_millis' };
  if (start !== undefined) {
    bounds.gte = start;
  }
  if (end !== undefined) {
    bounds.lte = end;
  }
  const rangeQuery: estypes.QueryDslQueryContainer = { range: { [timeField]: bounds } };
  if (!datafeedQuery) {
    return rangeQuery;
  }
  return { bool: { must: [datafeedQuery, rangeQuery] } };
};

/**
 * Projects a full Module to a slim summary to avoid large context from e.g. security_windows (13 jobs).
 * Strips logo, kibana objects, and full detector configs.
 */
function projectModuleSlim(module: Record<string, unknown>): Record<string, unknown> {
  const { logo: _logo, kibana: _kibana, datafeeds, jobs, ...meta } = module;

  const slimJobs = Array.isArray(jobs)
    ? jobs.map((j: Record<string, unknown>) => {
        const config = (j.config ?? {}) as Record<string, unknown>;
        const analysisConfig = (config.analysis_config ?? {}) as Record<string, unknown>;
        const detectors = Array.isArray(analysisConfig.detectors)
          ? analysisConfig.detectors.map((d: Record<string, unknown>) => ({
              function: d.function,
              ...(d.field_name !== undefined ? { field_name: d.field_name } : {}),
              ...(d.by_field_name !== undefined ? { by_field_name: d.by_field_name } : {}),
              ...(d.over_field_name !== undefined ? { over_field_name: d.over_field_name } : {}),
              ...(d.partition_field_name !== undefined
                ? { partition_field_name: d.partition_field_name }
                : {}),
            }))
          : [];
        return {
          id: j.id,
          bucket_span: analysisConfig.bucket_span,
          detectors,
          influencers: analysisConfig.influencers ?? [],
        };
      })
    : [];

  const slimDatafeeds = Array.isArray(datafeeds)
    ? datafeeds.map((d: Record<string, unknown>) => {
        const dfConfig = (d.config ?? {}) as Record<string, unknown>;
        return {
          id: d.id,
          job_id: d.job_id,
          indices: dfConfig.indices,
          query: dfConfig.query,
        };
      })
    : [];

  return { ...meta, jobs: slimJobs, datafeeds: slimDatafeeds };
}
