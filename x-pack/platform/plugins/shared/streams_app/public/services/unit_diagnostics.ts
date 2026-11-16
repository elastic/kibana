/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/server-route-repository-client';
import type { StreamsUnit } from '@kbn/streams-schema';
import type { Unit } from './unit_repository';
import { getPipelineRoutes, toPublishedUnit } from './unit_connections';
import { PIPELINE_ENTRY, type RouteRule } from './unit_pipeline';

/** A distributor diagnostic from a failed save, as the processing flyout shows it. */
export interface ProcessingDiagnostic extends Pick<StreamsUnit.Diagnostic, 'code' | 'message'> {
  /** Processor the diagnostic was traced back to, when it could be. */
  processorId?: string;
  /** Position of that processor in the flyout list, when it belongs to this node. */
  stepIndex?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The distributor locates a processor by its index in the unit document, which is stable because
// the unit is serialized in the order it is traced against here. Compiler errors carry a JSON
// pointer such as `/processors/1/config/0`; schema violations have no pointer and start their
// message with the dotted location instead, `processors.1.config.0...: ...`.
const PROCESSOR_POINTER = /^\/processors\/(\d+)(?:\/|$)/;
const PROCESSOR_LOCATION_PREFIX = /^processors\.(\d+)(?:[.:\s]|$)/;

const readProcessorIndex = (path: string | undefined, message: string): number | undefined => {
  const index = path
    ? PROCESSOR_POINTER.exec(path)?.[1]
    : PROCESSOR_LOCATION_PREFIX.exec(message)?.[1];
  return index === undefined ? undefined : Number(index);
};

/** The diagnostics the streams unit route returns in the body of a rejected save. */
const readDiagnostics = (error: unknown): unknown[] => {
  if (!isHttpFetchError(error)) {
    return [];
  }
  const body: unknown = error.body;
  const attributes = isRecord(body) ? body.attributes : undefined;
  const data = isRecord(attributes) ? attributes.data : undefined;
  return isRecord(data) && Array.isArray(data.diagnostics) ? data.diagnostics : [];
};

/** Distributor diagnostics from a failed unit save, traced back to processors of `savedUnit`. */
export const getProcessingDiagnostics = (
  error: unknown,
  savedUnit: Unit
): ProcessingDiagnostic[] => {
  const processors = savedUnit.unit.processors ?? [];
  return readDiagnostics(error).flatMap((diagnostic) => {
    if (!isRecord(diagnostic) || typeof diagnostic.message !== 'string') {
      return [];
    }
    const { code, message, path } = diagnostic;
    const index = readProcessorIndex(typeof path === 'string' ? path : undefined, message);
    return [
      {
        code: typeof code === 'string' ? code : '',
        message,
        processorId: index === undefined ? undefined : processors[index]?.id,
      },
    ];
  });
};

/** A distributor diagnostic from a failed save, traced back to a routing node and rule. */
export interface RoutingDiagnostic extends Pick<StreamsUnit.Diagnostic, 'code' | 'message'> {
  pipelineId: string;
  /** Position of the rule in the routing node, when the diagnostic points at one. */
  ruleIndex?: number;
}

// Like processors, a routing rule is located by its place in the unit document as sent:
// `/pipelines/0/config/1/value/2/when` for compiler errors, or a `pipelines.0.config.1.value.2`
// prefix on schema violations.
const PIPELINE_POINTER = /^\/pipelines\/(\d+)(?:\/config\/(\d+)(?:\/value\/(\d+))?)?(?:\/|$)/;
const PIPELINE_LOCATION_PREFIX =
  /^pipelines\.(\d+)(?:\.config\.(\d+)(?:\.value\.(\d+))?)?(?:[.:\s]|$)/;

interface PipelineLocation {
  pipelineIndex: number;
  entryIndex?: number;
  routeIndex?: number;
}

const readPipelineLocation = (
  path: string | undefined,
  message: string
): PipelineLocation | undefined => {
  const match = path ? PIPELINE_POINTER.exec(path) : PIPELINE_LOCATION_PREFIX.exec(message);
  if (!match) {
    return undefined;
  }
  const [, pipelineIndex, entryIndex, routeIndex] = match;
  return {
    pipelineIndex: Number(pipelineIndex),
    entryIndex: entryIndex === undefined ? undefined : Number(entryIndex),
    routeIndex: routeIndex === undefined ? undefined : Number(routeIndex),
  };
};

const isSameCondition = (left: RouteRule, right: RouteRule): boolean =>
  left.when === right.when && (left.action ?? 'move') === (right.action ?? 'move');

/**
 * The staged position of the rule at `routeIndex` of the sent pipeline's routes entry
 * `entryIndex`: the staged rule with the same condition and action, counting the
 * earlier ones that share them.
 */
const findStagedRuleIndex = (
  savedUnit: Unit,
  sent: Unit['unit']['pipelines'][number],
  entryIndex: number,
  routeIndex: number
): number | undefined => {
  const sentRoutes = sent.config.flatMap((entry, index) =>
    entry.name === PIPELINE_ENTRY.routes
      ? entry.value.map((route, position) => ({
          route,
          isTarget: index === entryIndex && position === routeIndex,
        }))
      : []
  );
  const target = sentRoutes.findIndex(({ isTarget }) => isTarget);
  if (target === -1) {
    return undefined;
  }
  const { route } = sentRoutes[target];
  const occurrence = sentRoutes
    .slice(0, target)
    .filter((earlier) => isSameCondition(earlier.route, route)).length;
  const matches = getPipelineRoutes(savedUnit, sent.id).flatMap((staged, index) =>
    isSameCondition(staged, route) ? [index] : []
  );
  return matches[occurrence];
};

/**
 * Distributor diagnostics from a failed unit save that point at a routing node of
 * `savedUnit`, the staged unit that was saved. The unit as sent leaves out rules
 * without targets and narrows the telemetry of the others, so a rule is matched
 * back by its condition and action, in order.
 */
export const getRoutingDiagnostics = (error: unknown, savedUnit: Unit): RoutingDiagnostic[] => {
  const sentPipelines = toPublishedUnit(savedUnit).unit.pipelines;
  return readDiagnostics(error).flatMap((diagnostic): RoutingDiagnostic[] => {
    if (!isRecord(diagnostic) || typeof diagnostic.message !== 'string') {
      return [];
    }
    const { code, message, path } = diagnostic;
    const location = readPipelineLocation(typeof path === 'string' ? path : undefined, message);
    const sent = location ? sentPipelines[location.pipelineIndex] : undefined;
    if (!location || !sent || !sent.config.some(({ name }) => name === PIPELINE_ENTRY.routes)) {
      return [];
    }
    const entry = location.entryIndex === undefined ? undefined : sent.config[location.entryIndex];
    // Diagnostics on the pipeline's sources or processors are not about its routing.
    if (entry && entry.name !== PIPELINE_ENTRY.routes) {
      return [];
    }
    const routing: RoutingDiagnostic = {
      code: typeof code === 'string' ? code : '',
      message,
      pipelineId: sent.id,
    };
    if (!entry || location.entryIndex === undefined || location.routeIndex === undefined) {
      return [routing];
    }
    const ruleIndex = findStagedRuleIndex(
      savedUnit,
      sent,
      location.entryIndex,
      location.routeIndex
    );
    return [ruleIndex === undefined ? routing : { ...routing, ruleIndex }];
  });
};
