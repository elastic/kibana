/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_OBSERVABLES_PER_CASE } from '../../common/constants';
import type { Observable } from '../../common/types/domain';
import type { ObservableService, ObservablesPreview } from '../services/observables';

interface CaseWithFieldObservables {
  id: string;
  /** The observables stored in the case's `observables` field. */
  observables: Observable[];
}

/**
 * Gets, in one aggregation, each case's count of `cases-observables` objects and enough of its
 * oldest to fill the case response with the most room left after the field's observables.
 */
export const getObservablesPreviews = async (
  observableService: ObservableService,
  cases: CaseWithFieldObservables[]
): Promise<Map<string, ObservablesPreview>> => {
  const previewSize = cases.reduce(
    (size, { observables }) => Math.max(size, MAX_OBSERVABLES_PER_CASE - observables.length),
    0
  );

  return observableService.getter.getPreviews(
    cases.map(({ id }) => id),
    previewSize
  );
};

/** {@link getObservablesPreviews} for one case. */
export const getObservablesPreview = async (
  observableService: ObservableService,
  theCase: CaseWithFieldObservables
): Promise<ObservablesPreview | undefined> =>
  (await getObservablesPreviews(observableService, [theCase])).get(theCase.id);

/**
 * Lists the case field's observables first, then the case's oldest `cases-observables` objects
 * while fewer than 50 are listed, and counts both stores in `total_observables`. A field that
 * holds more than 50, which an import can write, is listed in full.
 */
export const mergeObservablesPreview = <T extends CaseWithFieldObservables>(
  theCase: T,
  preview: ObservablesPreview | undefined
): T & { total_observables: number } => {
  const { observables } = theCase;
  const room = Math.max(0, MAX_OBSERVABLES_PER_CASE - observables.length);

  return {
    ...theCase,
    observables: [...observables, ...(preview?.oldest ?? []).slice(0, room)],
    total_observables: observables.length + (preview?.count ?? 0),
  };
};

/**
 * Adds the observables preview and total to one case response, for builders that have no other
 * per-case read to run the preview alongside.
 */
export const withObservablesPreview = async <T extends CaseWithFieldObservables>(
  observableService: ObservableService,
  theCase: T
): Promise<T & { total_observables: number }> =>
  mergeObservablesPreview(theCase, await getObservablesPreview(observableService, theCase));
