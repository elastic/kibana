/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_OBSERVABLES_PER_CASE } from '../../common/constants';
import type { Observable } from '../../common/types/domain';
import type { ObservableService, ObservablesPreview } from '../services/observables';

interface CaseWithObservables {
  id: string;
  observables?: Observable[] | null;
  total_observables?: number | null;
}

/**
 * Fills a case response's observables: the case field's observables first, then the case's oldest
 * `cases-observables` objects, up to the preview size. The total counts both stores.
 */
export const mergeObservablesPreview = <T extends CaseWithObservables>(
  theCase: T,
  preview: ObservablesPreview | undefined
): T & { observables: Observable[]; total_observables: number } => {
  const fieldObservables = theCase.observables ?? [];
  const room = Math.max(0, MAX_OBSERVABLES_PER_CASE - fieldObservables.length);

  return {
    ...theCase,
    observables: [...fieldObservables, ...(preview?.oldest ?? []).slice(0, room)],
    total_observables: fieldObservables.length + (preview?.count ?? 0),
  };
};

/**
 * Adds the observables preview and total to case responses, with one aggregation for all of them.
 * Only response builders call this; the case reads that write paths use keep the field alone, so
 * no write copies objects of the type into the field.
 */
export const withObservablesPreview = async <T extends CaseWithObservables>(
  cases: T[],
  observableService: ObservableService
): Promise<Array<T & { observables: Observable[]; total_observables: number }>> => {
  const previews = await getObservablesPreviews(cases, observableService);
  return cases.map((theCase) => mergeObservablesPreview(theCase, previews.get(theCase.id)));
};

/**
 * The previews of several cases in one aggregation, sized for the case whose field holds the
 * fewest observables. Lets callers fetch previews next to other per-case stats.
 */
export const getObservablesPreviews = async (
  cases: Array<Pick<CaseWithObservables, 'id' | 'observables'>>,
  observableService: ObservableService
): Promise<Map<string, ObservablesPreview>> => {
  if (cases.length === 0) {
    return new Map();
  }

  const previewSize = Math.max(
    0,
    ...cases.map(({ observables }) => MAX_OBSERVABLES_PER_CASE - (observables?.length ?? 0))
  );

  return observableService.getPreviews(
    cases.map(({ id }) => id),
    previewSize
  );
};

/** {@link withObservablesPreview} for a single case response. */
export const withCaseObservablesPreview = async <T extends CaseWithObservables>(
  theCase: T,
  observableService: ObservableService
): Promise<T & { observables: Observable[]; total_observables: number }> => {
  const [withPreview] = await withObservablesPreview([theCase], observableService);
  return withPreview;
};
