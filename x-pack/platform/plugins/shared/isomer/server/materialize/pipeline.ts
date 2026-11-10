/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ValidationError } from '@kbn/isomer';
import type { MaterializeContext, MaterializeInput } from '../../common';
import { mergeContext } from './context';
import { resolveTimeRange } from './time_range';
import type { ExecutedTable } from './executors/esql';
import type {
  MaterializedNode,
  MaterializedNodeSource,
  MaterializeLoss,
  UnsupportedNode,
} from './nodes';
import { isChartNode, isUnsupportedNode } from './nodes';
import type {
  AggsDataRequest,
  DataRequest,
  EsqlDataRequest,
  MaterializeDescription,
  MaterializeKit,
  Materializer,
  MaterializeResults,
} from './types';
import { createUnsupportedNode } from './unsupported';

export interface PipelineDeps {
  /** Runs one ES|QL request in its merged context. `index` is its place among the plan's tables. */
  executeEsql: (
    request: EsqlDataRequest,
    context: MaterializeContext,
    index: number
  ) => Promise<ExecutedTable>;
  /** Runs one `aggs` request in its merged context. `index` is its place among the plan's tables. */
  executeAggs: (
    request: AggsDataRequest,
    context: MaterializeContext,
    index: number
  ) => Promise<ExecutedTable>;
  /** Materializes a nested input, one level deeper. */
  materialize: (input: MaterializeInput, context: MaterializeContext) => Promise<MaterializedNode>;
  /** The user's `dateFormat:tz`, which relative time ranges resolve in without a context time zone. */
  getTimeZone: () => Promise<string>;
  /** The kit a materializer maps with, for the context its plan ran in. */
  createKit: (context: MaterializeContext) => Promise<MaterializeKit>;
  /** The node's validation errors against the runtime's packs, with paths relative to the node. */
  validate: (node: MaterializedNode) => Promise<ValidationError[]>;
  kibanaVersion: string;
  now: () => Date;
}

export interface PipelineRun<TConfig> {
  type: string;
  materializer: Materializer<TConfig>;
  config: TConfig;
  context: MaterializeContext;
  /** Describes the config for a placeholder. Defaults to the materializer's `describe`. */
  describe?: () => MaterializeDescription | undefined;
  savedObjectId?: string;
  spaceId?: string;
}

/** Raised for a data request kind the pipeline has no executor for. */
class UnsupportedRequestError extends Error {
  constructor(kind: DataRequest['kind']) {
    super(
      i18n.translate('xpack.isomer.materialize.noExecutor', {
        defaultMessage: 'Kibana cannot run "{kind}" data requests for materialization.',
        values: { kind },
      })
    );
  }
}

/** A materializer's own placeholder, rebuilt so only its known fields reach the result. */
const rebuildUnsupported = (
  { reason, title, link }: UnsupportedNode,
  description: MaterializeDescription = {},
  source?: MaterializedNodeSource
): UnsupportedNode =>
  createUnsupportedNode(
    reason,
    { title: title || description.title, link: link ?? description.link },
    source
  );

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const executePlan = async (
  plan: DataRequest[],
  context: MaterializeContext,
  deps: PipelineDeps
): Promise<{ results: MaterializeResults; losses: MaterializeLoss[] }> => {
  const tables: Array<Promise<ExecutedTable>> = [];
  const nodes: Array<Promise<MaterializedNode>> = [];
  for (const request of plan) {
    const requestContext = mergeContext(context, request.context);
    switch (request.kind) {
      case 'esql':
        tables.push(deps.executeEsql(request, requestContext, tables.length));
        break;
      case 'aggs':
        tables.push(deps.executeAggs(request, requestContext, tables.length));
        break;
      case 'materialize':
        nodes.push(deps.materialize(request.input, requestContext));
        break;
      default:
        throw new UnsupportedRequestError(request.kind);
    }
  }
  const [executed, materialized] = await Promise.all([Promise.all(tables), Promise.all(nodes)]);
  return {
    results: { tables: executed.map(({ table }) => table), nodes: materialized },
    losses: executed.flatMap(({ losses }) => losses),
  };
};

/**
 * The context with its time range resolved against `now`, in the context's time zone or the
 * user's `dateFormat:tz`, so the queries and provenance agree.
 */
const withAbsoluteTimeRange = async (
  context: MaterializeContext,
  now: Date,
  getTimeZone: () => Promise<string>
): Promise<MaterializeContext> =>
  context.timeRange
    ? {
        ...context,
        timeRange: resolveTimeRange(context.timeRange, {
          now,
          timeZone: context.timeZone ?? (await getTimeZone()),
        }),
      }
    : context;

const withProvenance = (
  node: MaterializedNode,
  losses: MaterializeLoss[],
  source: MaterializedNodeSource
): MaterializedNode => {
  if (!isChartNode(node)) {
    return node;
  }
  const allLosses = [...(node.losses ?? []), ...losses];
  return { ...node, source, ...(allLosses.length > 0 ? { losses: allLosses } : {}) };
};

const invalidNode = (type: string, errors: ValidationError[]): string =>
  i18n.translate('xpack.isomer.materialize.invalidNode', {
    defaultMessage: 'The {type} materialized into an invalid node: {errors}',
    values: {
      type,
      errors: errors
        .slice(0, 3)
        .map(({ path, message }) => (path ? `${path} ${message}` : message))
        .join('; '),
    },
  });

/**
 * Plans, runs and maps one config. Anything that fails, and any result that doesn't validate,
 * becomes `unsupported` with a reason.
 */
export const runPipeline = async <TConfig>(
  {
    type,
    materializer,
    config,
    context: callerContext,
    describe = () => materializer.describe?.(config),
    savedObjectId,
    spaceId,
  }: PipelineRun<TConfig>,
  deps: PipelineDeps
): Promise<MaterializedNode> => {
  const now = deps.now();
  const context = await withAbsoluteTimeRange(callerContext, now, deps.getTimeZone);
  const source: MaterializedNodeSource = {
    host: 'kibana',
    hostVersion: deps.kibanaVersion,
    meta: {
      materializer: type,
      materializerVersion: materializer.version,
      ...(spaceId ? { spaceId } : {}),
      ...(savedObjectId ? { savedObjectType: type, savedObjectId } : {}),
    },
    ...(context.timeRange
      ? { timeRange: { from: context.timeRange.from, to: context.timeRange.to } }
      : {}),
    capturedAt: now.toISOString(),
  };
  const description = describe();
  const unsupported = (reason: string) => createUnsupportedNode(reason, description, source);

  const plan = materializer.plan(config, context);
  if (!Array.isArray(plan)) {
    return rebuildUnsupported(plan, description, source);
  }

  let executed: Awaited<ReturnType<typeof executePlan>>;
  try {
    executed = await executePlan(plan, context, deps);
  } catch (error) {
    return unsupported(
      i18n.translate('xpack.isomer.materialize.dataFailed', {
        defaultMessage: 'The data for this {type} could not be loaded: {message}',
        values: { type, message: errorMessage(error) },
      })
    );
  }

  const mapped = materializer.map(config, executed.results, await deps.createKit(context));
  if (isUnsupportedNode(mapped)) {
    return rebuildUnsupported(mapped, description, source);
  }

  const node = withProvenance(mapped, executed.losses, source);
  const errors = await deps.validate(node);
  return errors.length > 0 ? unsupported(invalidNode(type, errors)) : node;
};
