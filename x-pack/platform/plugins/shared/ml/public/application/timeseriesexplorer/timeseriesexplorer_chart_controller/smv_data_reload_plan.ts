/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';

/**
 * Minimal props snapshot for “should we reload SMV context data?” decisions.
 * Built via {@link smvReloadSnapshotFromSmvHostProps} before calling {@link getSmvDataReloadPlan}.
 */
export interface SmvDataReloadSnapshot {
  bounds: unknown;
  lastRefresh: number;
  selectedDetectorIndex: unknown;
  selectedEntities: unknown;
  selectedForecastId: string | undefined;
  selectedJobId: string | undefined;
  /**
   * When the host keeps a full `selectedJob` object (embeddable), include its `job_id`
   * so a materialized job change is detected even if `selectedJobId` stayed in sync.
   */
  materializedJobId?: string;
  functionDescription: unknown;
}

function jobIdentityChanged(prev: SmvDataReloadSnapshot, next: SmvDataReloadSnapshot): boolean {
  if (prev.selectedJobId !== next.selectedJobId) {
    return true;
  }
  const prevMat = prev.materializedJobId;
  const nextMat = next.materializedJobId;
  if (prevMat !== undefined || nextMat !== undefined) {
    return prevMat !== nextMat;
  }
  return false;
}

export interface SmvDataReloadPlan {
  shouldReload: boolean;
  fullRefresh: boolean;
}

/**
 * Pure reload rules shared by full-page {@link TimeSeriesExplorer} and
 * {@link TimeSeriesExplorerEmbeddableChart} `componentDidUpdate` logic.
 *
 * - **lastRefresh** alone triggers a reload with **fullRefresh false** (soft refresh),
 *   except when `previous.lastRefresh === 0` (avoids duplicate load on first paint).
 * - **fullRefresh** mirrors the legacy subset: bounds / detector / entities / forecast /
 *   job identity / function description (not lastRefresh-only ticks).
 */
export function getSmvDataReloadPlan(
  previous: SmvDataReloadSnapshot | undefined,
  next: SmvDataReloadSnapshot
): SmvDataReloadPlan {
  if (previous === undefined) {
    return { shouldReload: true, fullRefresh: true };
  }

  const boundsChanged = !isEqual(previous.bounds, next.bounds);
  const lastRefreshTick =
    !isEqual(previous.lastRefresh, next.lastRefresh) && previous.lastRefresh !== 0;
  const detectorChanged = !isEqual(previous.selectedDetectorIndex, next.selectedDetectorIndex);
  const entitiesChanged = !isEqual(previous.selectedEntities, next.selectedEntities);
  const forecastChanged = previous.selectedForecastId !== next.selectedForecastId;
  const jobChanged = jobIdentityChanged(previous, next);
  const functionDescriptionChanged = previous.functionDescription !== next.functionDescription;

  const shouldReload =
    boundsChanged ||
    lastRefreshTick ||
    detectorChanged ||
    entitiesChanged ||
    forecastChanged ||
    jobChanged ||
    functionDescriptionChanged;

  const fullRefresh =
    boundsChanged ||
    detectorChanged ||
    entitiesChanged ||
    forecastChanged ||
    jobChanged ||
    functionDescriptionChanged;

  return { shouldReload, fullRefresh };
}

/**
 * Props slice read by SMV hosts for reload decisions.
 * Pass optional `selectedJob` (embeddable) so {@link SmvDataReloadSnapshot#materializedJobId}
 * participates in job identity; omit on full-page SMV (`selectedJobId` only).
 */
export interface SmvReloadHostPropsInput {
  bounds: unknown;
  lastRefresh: number;
  selectedDetectorIndex: unknown;
  selectedEntities: unknown;
  selectedForecastId: string | undefined;
  selectedJobId: string;
  functionDescription: unknown;
  selectedJob?: { job_id?: string };
}

export function smvReloadSnapshotFromSmvHostProps(
  props: SmvReloadHostPropsInput
): SmvDataReloadSnapshot {
  return {
    bounds: props.bounds,
    lastRefresh: props.lastRefresh,
    selectedDetectorIndex: props.selectedDetectorIndex,
    selectedEntities: props.selectedEntities,
    selectedForecastId: props.selectedForecastId,
    selectedJobId: props.selectedJobId,
    materializedJobId: props.selectedJob?.job_id,
    functionDescription: props.functionDescription,
  };
}
