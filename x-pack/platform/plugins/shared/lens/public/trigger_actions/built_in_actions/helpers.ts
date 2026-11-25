/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiHasParentApi, apiPublishesTimeRange } from '@kbn/presentation-publishing';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { TimeRange } from '@kbn/es-query';
import type { LensBuiltInActionId, LensTelemetrySource } from '@kbn/lens-common';

interface PublishesBuiltInActionIds {
  builtInActionIds$: PublishingSubject<LensBuiltInActionId[] | undefined>;
}

const apiPublishesBuiltInActionIds = (api: unknown): api is PublishesBuiltInActionIds =>
  Boolean(api && typeof api === 'object' && 'builtInActionIds$' in api);

/** Whether the renderer hosting the embeddable asked for the given built-in action. */
export const isBuiltInActionRequested = (
  embeddable: unknown,
  actionId: LensBuiltInActionId
): boolean =>
  apiHasParentApi(embeddable) &&
  apiPublishesBuiltInActionIds(embeddable.parentApi) &&
  Boolean(embeddable.parentApi.builtInActionIds$.getValue()?.includes(actionId));

/** Lets the renderer hosting the embeddable know that a built-in action was run. */
export const notifyBuiltInActionExecuted = (
  embeddable: unknown,
  actionId: LensBuiltInActionId
): void => {
  if (!apiHasParentApi(embeddable)) return;
  const { onBuiltInAction } = embeddable.parentApi as {
    onBuiltInAction?: (actionId: LensBuiltInActionId) => void;
  };
  onBuiltInAction?.(actionId);
};

/** The telemetry source set on the renderer hosting the embeddable, if any. */
export const getTelemetrySource = (embeddable: unknown): LensTelemetrySource | undefined =>
  apiHasParentApi(embeddable)
    ? (embeddable.parentApi as { telemetrySource?: LensTelemetrySource }).telemetrySource
    : undefined;

/** The panel time range, falling back to the one of the renderer hosting the embeddable. */
export const getEffectiveTimeRange = (embeddable: unknown): TimeRange | undefined => {
  if (apiPublishesTimeRange(embeddable)) {
    const panelTimeRange = embeddable.timeRange$.getValue();
    if (panelTimeRange) return panelTimeRange;
  }
  return apiHasParentApi(embeddable) && apiPublishesTimeRange(embeddable.parentApi)
    ? embeddable.parentApi.timeRange$.getValue()
    : undefined;
};
