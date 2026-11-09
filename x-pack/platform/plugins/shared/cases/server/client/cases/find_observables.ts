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
import { getObservableSortFields } from '../../services/observables';
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
 */
export const findObservables = async (
  caseId: string,
  params: FindObservablesRequest,
  clientArgs: CasesClientArgs
): Promise<FindObservablesResponse> => {
  const {
    services: { caseService, observableService },
    authorization,
    logger,
  } = clientArgs;

  try {
    const { perPage, cursor, sortField, sortOrder, typeKeys, search } = decodeWithExcessOrThrowZod(
      FindObservablesRequestSchema
    )(params);

    const theCase = await caseService.getCase({ id: caseId });

    await authorization.ensureAuthorized({
      operation: Operations.findObservables,
      entities: [{ id: theCase.id, owner: theCase.attributes.owner }],
    });

    const searchAfter = cursor != null ? decodeCursor(cursor, sortField) : undefined;
    const prefix = search?.toLowerCase();
    const typeKeySet = typeKeys != null && typeKeys.length > 0 ? new Set(typeKeys) : undefined;

    const fieldMatches = (theCase.attributes.observables ?? [])
      .filter(
        ({ typeKey, value }) =>
          (typeKeySet == null || typeKeySet.has(typeKey)) &&
          (prefix == null || prefix.length === 0 || value.toLowerCase().startsWith(prefix))
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

    return decodeOrThrowZod(FindObservablesResponseSchema)({
      observables: page.map(({ observable }) => observable),
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
