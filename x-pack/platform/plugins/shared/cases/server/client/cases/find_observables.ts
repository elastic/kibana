/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { FindObservablesRequest, FindObservablesResponse } from '../../../common/types/api';
import {
  FindObservablesRequestSchema,
  FindObservablesResponseSchema,
} from '../../../common/types/api';
import type { Observable } from '../../../common/types/domain';
import { decodeOrThrowZod, decodeWithExcessOrThrowZod } from '../../common/runtime_types';
import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';
import type {
  ObservableSortField,
  ObservableSortOrder,
  ObservableSortValues,
} from '../../services/observables';
import { getObservableSortFields, observableKey, toObservable } from '../../services/observables';
import { MAX_METADATA_FILTER_VALUES } from '../../../common/constants';
import type { CasesClientArgs } from '../types';

const SORT_VALUE_GETTERS: Readonly<
  Record<ObservableSortField, (observable: Observable) => string | number>
> = {
  createdAt: ({ createdAt }) => Date.parse(createdAt),
  value: ({ value }) => value,
  typeKey: ({ typeKey }) => typeKey,
};

/** The values a page of observables is sorted by, as Elasticsearch returns them. */
export const getSortValues = (
  observable: Observable,
  sortField: ObservableSortField
): ObservableSortValues =>
  getObservableSortFields(sortField).map((field) => SORT_VALUE_GETTERS[field](observable));

/** Compares keywords by their UTF-8 bytes, the order Elasticsearch sorts them in. */
const compareKeywords = (a: string, b: string): number =>
  Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));

/**
 * Compares two sort tuples the way the type's search sorts them: the first value in the requested
 * order, the tie-breakers ascending.
 */
export const compareSortValues = (
  a: ObservableSortValues,
  b: ObservableSortValues,
  sortOrder: ObservableSortOrder
): number => {
  for (let index = 0; index < a.length; index++) {
    const left = a[index];
    const right = b[index];
    const compared =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : compareKeywords(String(left), String(right));

    if (compared !== 0) {
      return index === 0 && sortOrder === 'desc' ? -compared : compared;
    }
  }
  return 0;
};

export const encodeCursor = (sortValues: ObservableSortValues): string =>
  Buffer.from(JSON.stringify(sortValues)).toString('base64');

export const decodeCursor = (
  cursor: string,
  sortField: ObservableSortField
): ObservableSortValues => {
  const fields = getObservableSortFields(sortField);

  try {
    const decoded: unknown = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    const isValid =
      Array.isArray(decoded) &&
      decoded.length === fields.length &&
      decoded.every((value, index) =>
        fields[index] === 'createdAt' ? typeof value === 'number' : typeof value === 'string'
      );

    if (isValid) {
      return decoded;
    }
  } catch {
    // fall through to the bad request below
  }

  throw Boom.badRequest('Invalid observables cursor');
};

/**
 * Lists a case's observables a page at a time across both stores. The case field (at most about
 * 50) is filtered and sorted in memory with the same rules as the search of the case's
 * `cases-observables` objects, and the two are merged under one cursor: the sort values of the
 * last observable returned.
 *
 * A metadata filter first finds the values of the case's space and owner whose shared metadata
 * matches, capped, then keeps the case's observables with those type keys and values. Every
 * observable of the page carries the metadata its value holds.
 */
export const findObservables = async (
  caseId: string,
  params: FindObservablesRequest,
  clientArgs: CasesClientArgs
): Promise<FindObservablesResponse> => {
  const {
    services: { caseService, observableService, observableSharedService },
    authorization,
    logger,
  } = clientArgs;

  try {
    const {
      perPage,
      cursor,
      sortField,
      sortOrder,
      typeKeys,
      search,
      metadata: metadataFilters,
    } = decodeWithExcessOrThrowZod(FindObservablesRequestSchema)(params);

    const theCase = await caseService.getCase({ id: caseId });

    await authorization.ensureAuthorized({
      operation: Operations.findObservables,
      entities: [{ id: theCase.id, owner: theCase.attributes.owner }],
    });

    const { owner } = theCase.attributes;
    const metadataKeys =
      metadataFilters != null && metadataFilters.length > 0
        ? await observableSharedService.findKeysByMetadata({
            owner,
            filters: metadataFilters,
            cap: MAX_METADATA_FILTER_VALUES,
          })
        : undefined;

    // No value of the space and owner matches the metadata filter, so no observable can.
    if (metadataKeys != null && metadataKeys.length === 0) {
      return decodeOrThrowZod(FindObservablesResponseSchema)({ observables: [], total: 0 });
    }

    const searchAfter = cursor != null ? decodeCursor(cursor, sortField) : undefined;
    const prefix = search?.toLowerCase();
    const typeKeySet = typeKeys != null && typeKeys.length > 0 ? new Set(typeKeys) : undefined;
    const metadataKeySet =
      metadataKeys != null ? new Set(metadataKeys.map(observableKey)) : undefined;

    const fieldMatches = (theCase.attributes.observables ?? [])
      .filter(
        (observable) =>
          (typeKeySet == null || typeKeySet.has(observable.typeKey)) &&
          (prefix == null ||
            prefix.length === 0 ||
            observable.value.toLowerCase().startsWith(prefix)) &&
          (metadataKeySet == null || metadataKeySet.has(observableKey(observable)))
      )
      .map((observable) => ({ observable, sort: getSortValues(observable, sortField) }));

    const typePage = await observableService.findPage({
      caseId: theCase.id,
      perPage,
      searchAfter,
      sortField,
      sortOrder,
      typeKeys,
      search,
      keys: metadataKeys,
    });

    const page = [
      ...fieldMatches.filter(
        ({ sort }) => searchAfter == null || compareSortValues(sort, searchAfter, sortOrder) > 0
      ),
      ...typePage.items,
    ]
      .sort((a, b) => compareSortValues(a.sort, b.sort, sortOrder))
      .slice(0, perPage);

    const last = page[page.length - 1];

    const sharedByKey = await observableSharedService.findByKeys(
      owner,
      page.map(({ observable }) => observable)
    );

    return decodeOrThrowZod(FindObservablesResponseSchema)({
      observables: page.map(({ observable }) => {
        const shared = sharedByKey.get(observableKey(observable));
        return shared != null && Object.keys(shared.metadata).length > 0
          ? { ...observable, metadata: shared.metadata }
          : observable;
      }),
      total: fieldMatches.length + typePage.total,
      ...(page.length === perPage && last != null && { cursor: encodeCursor(last.sort) }),
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to find observables of case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

/**
 * The observables of a case with the given ids, in either store. Ids that the case does not hold
 * are left out.
 */
export const getObservablesByIds = async (
  caseId: string,
  ids: string[],
  clientArgs: CasesClientArgs
): Promise<Observable[]> => {
  const {
    services: { caseService, observableService },
    authorization,
    logger,
  } = clientArgs;

  try {
    const theCase = await caseService.getCase({ id: caseId });

    await authorization.ensureAuthorized({
      operation: Operations.findObservables,
      entities: [{ id: theCase.id, owner: theCase.attributes.owner }],
    });

    const idSet = new Set(ids);
    const inField = (theCase.attributes.observables ?? []).filter(({ id }) => idSet.has(id));
    const inFieldIds = new Set(inField.map(({ id }) => id));
    const { found } = await observableService.getForCase(
      theCase.id,
      ids.filter((id) => !inFieldIds.has(id))
    );

    return [...inField, ...found.map(toObservable)];
  } catch (error) {
    throw createCaseError({
      message: `Failed to get observables of case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
