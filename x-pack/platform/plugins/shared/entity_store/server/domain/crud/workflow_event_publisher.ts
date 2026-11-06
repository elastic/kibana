/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { get } from 'lodash';
import type { Entity, EntityType } from '../../../common';
import type { AssetCriticalityLevel } from '../../../common/domain/definitions/entity.gen';
import {
  ENTITY_ASSET_CRITICALITY_UPDATED_TRIGGER_ID,
  ENTITY_RISK_SCORE_CHANGED_TRIGGER_ID,
  ASSET_CRITICALITY_UPDATED_WATCHED_FIELDS,
  RISK_SCORE_CHANGED_WATCHED_FIELDS,
} from '../../../common/workflow/triggers';
import { runWithSpan } from '../../telemetry/traces';

export const ALL_WORKFLOW_WATCHED_FIELDS = [
  ...ASSET_CRITICALITY_UPDATED_WATCHED_FIELDS,
  ...RISK_SCORE_CHANGED_WATCHED_FIELDS,
] as const;

export interface WorkflowEmitTarget {
  entityId: string;
  entityType: EntityType;
  doc: Entity;
}

type RiskScoreWorkflowEmitTarget = WorkflowEmitTarget & {
  previousScore: number | null;
};

type AssetCriticalityWorkflowEmitTarget = WorkflowEmitTarget & {
  // `undefined` means "no previous doc / field found" (unknown baseline, e.g. mget miss)
  // and must NOT be treated as a known previous value of `null`, or a first-ever
  // criticality of `null` would be wrongly suppressed as a no-op.
  previousCriticality: AssetCriticalityLevel | null | undefined;
};

interface WorkflowEventPublisherOpts {
  emit?: (triggerId: string, payload: Record<string, unknown>) => Promise<void>;
  fetchDocsFn: (ids: string[], fields: readonly string[]) => Promise<Map<string, Entity>>;
  logger: Logger;
  namespace: string;
}

export class WorkflowEventPublisher {
  private readonly logger: Logger;
  private readonly emit?: (triggerId: string, payload: Record<string, unknown>) => Promise<void>;
  private readonly fetchDocsFn: (
    ids: string[],
    fields: readonly string[]
  ) => Promise<Map<string, Entity>>;
  private readonly namespace: string;

  constructor({ logger, emit, fetchDocsFn, namespace }: WorkflowEventPublisherOpts) {
    this.logger = logger;
    this.emit = emit;
    this.fetchDocsFn = fetchDocsFn;
    this.namespace = namespace;
    this.initWithTracing();
  }

  // Wraps the injected `emit` dependency so every trigger emit runs inside its
  // own span; a rejected emit is recorded on that span as an error before the
  // rejection continues on to the Promise.allSettled fail-count/logger.warn path.
  private initWithTracing(): void {
    const baseEmit = this.emit;
    if (!baseEmit) return;

    const namespace = this.namespace;
    const tracedEmit = (triggerId: string, payload: Record<string, unknown>): Promise<void> =>
      runWithSpan({
        name: `entityStore.workflow.emit.${triggerId}`,
        namespace,
        attributes: {
          'entity_store.workflow.trigger_id': triggerId,
          ...(typeof payload.entityType === 'string'
            ? { 'entity_store.entity.type': payload.entityType }
            : {}),
          ...(typeof payload.entityId === 'string'
            ? { 'entity_store.entity.id': payload.entityId }
            : {}),
        },
        cb: () => baseEmit(triggerId, payload),
      });

    Object.defineProperty(this, 'emit', {
      value: tracedEmit,
      configurable: true,
      writable: true,
    });
  }

  public async maybeGetExistingDocs(docs: Entity[]): Promise<Map<string, Entity>> {
    if (!this.emit || docs.length === 0) return new Map<string, Entity>();
    const shouldEmit = docs.some((doc) =>
      ALL_WORKFLOW_WATCHED_FIELDS.some((field) => get(doc, field) !== undefined)
    );

    if (shouldEmit) {
      return await this.fetchDocsFn(
        docs.filter((doc) => !!doc?.entity?.id).map((doc) => doc?.entity?.id!),
        ALL_WORKFLOW_WATCHED_FIELDS
      );
    }

    return new Map<string, Entity>();
  }

  public emitAssetCriticalityUpdated(targets: AssetCriticalityWorkflowEmitTarget[]): void {
    if (!this.emit || targets.length === 0) return;
    const emitPromises = targets.flatMap(({ entityId, entityType, doc, previousCriticality }) => {
      try {
        const updatedCriticalityLevel = get(doc, ASSET_CRITICALITY_UPDATED_WATCHED_FIELDS[0]);
        if (updatedCriticalityLevel === undefined) return [];
        if (previousCriticality !== undefined && updatedCriticalityLevel === previousCriticality) {
          return [];
        }
        return [
          this.emit!(ENTITY_ASSET_CRITICALITY_UPDATED_TRIGGER_ID, {
            entityId,
            entityType,
            criticalityLevel: updatedCriticalityLevel,
          }),
        ];
      } catch (error) {
        // A synchronous throw here (e.g. from `emit` itself) must not escape this
        // fire-and-forget method; fold it into the same rejected-promise path as an
        // async emit failure so it's logged as a warning instead of failing the caller.
        return [Promise.reject(error)];
      }
    });

    if (emitPromises.length === 0) return;
    Promise.allSettled(emitPromises)
      .then((results) => {
        const failCount = results.filter((r) => r.status === 'rejected').length;
        if (failCount > 0) {
          this.logger.warn(
            `Failed to emit asset criticality trigger for ${failCount} of ${emitPromises.length} entities`
          );
        }
      })
      .catch(() => {});
  }

  public emitRiskScoreChanged(targets: RiskScoreWorkflowEmitTarget[]): void {
    if (!this.emit || targets.length === 0) return;
    const emitPromises = targets.flatMap(({ entityId, entityType, doc, previousScore }) => {
      try {
        const newScore = get(doc, RISK_SCORE_CHANGED_WATCHED_FIELDS[0]);
        if (newScore === undefined) return [];
        const signedDelta = previousScore != null ? newScore - previousScore : null;
        if (signedDelta === 0) return [];
        const direction = signedDelta != null ? (signedDelta > 0 ? 'increase' : 'decrease') : null;
        const delta = signedDelta != null ? Math.abs(signedDelta) : null;
        return [
          this.emit!(ENTITY_RISK_SCORE_CHANGED_TRIGGER_ID, {
            entityId,
            entityType,
            score: newScore,
            previousScore,
            delta,
            direction,
          }),
        ];
      } catch (error) {
        // See the matching catch in emitAssetCriticalityUpdated: fold synchronous
        // throws into the rejected-promise path so they're logged, not propagated.
        return [Promise.reject(error)];
      }
    });

    if (emitPromises.length === 0) return;
    Promise.allSettled(emitPromises)
      .then((results) => {
        const failCount = results.filter((r) => r.status === 'rejected').length;
        if (failCount > 0) {
          this.logger.warn(
            `Failed to emit risk score changed trigger for ${failCount} of ${emitPromises.length} entities`
          );
        }
      })
      .catch(() => {});
  }

  public emitEvents(targets: WorkflowEmitTarget[], previousDocs: Map<string, Entity>): void {
    if (!this.emit || targets.length === 0) return;
    this.emitAssetCriticalityUpdated(
      targets
        .filter(({ doc }) =>
          ASSET_CRITICALITY_UPDATED_WATCHED_FIELDS.some((field) => get(doc, field) !== undefined)
        )
        .map((target) => ({
          ...target,
          previousCriticality: previousDocs.get(target.entityId)?.asset?.criticality,
        }))
    );

    this.emitRiskScoreChanged(
      targets
        .filter(({ doc }) =>
          RISK_SCORE_CHANGED_WATCHED_FIELDS.some((field) => get(doc, field) !== undefined)
        )
        .map((target) => ({
          ...target,
          previousScore:
            (previousDocs.get(target.entityId)?.entity?.risk?.calculated_score_norm as number) ??
            null,
        }))
    );
  }
}
