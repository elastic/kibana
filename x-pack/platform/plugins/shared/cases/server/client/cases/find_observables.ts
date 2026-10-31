/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindObservablesRequest, FindObservablesResponse } from '../../../common/types/api';
import { FindObservablesRequestSchema } from '../../../common/types/api';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { decodeWithExcessOrThrowZod } from '../../common/runtime_types';
import {
  decodeObservablesCursor,
  encodeObservablesCursor,
  pageCaseFieldObservables,
} from '../../services/observables';
import type { CasesClientArgs } from '../types';

/**
 * One page of the observables of a case, sorted and filtered by type on the server.
 *
 * It requires the same access as getting the case, and emits the same audit event. While the case field
 * is the source of truth, or when `xpack.cases.observables.readSource` says `case`, the page is cut from
 * the observables of the case, which are complete as long as the limit is 50. Otherwise it is read from
 * the observables index.
 */
export const findObservables = async (
  caseId: string,
  params: FindObservablesRequest,
  clientArgs: CasesClientArgs
): Promise<FindObservablesResponse> => {
  const {
    services: { caseService, observablesService, observablesStorageMode },
    authorization,
    spaceId,
    logger,
  } = clientArgs;

  try {
    const { typeKeys, sortField, sortOrder, perPage, cursor } = decodeWithExcessOrThrowZod(
      FindObservablesRequestSchema
    )(params);

    const theCase = await caseService.getCase({ id: caseId });
    const { owner } = theCase.attributes;

    await authorization.ensureAuthorized({
      operation: Operations.getCase,
      entities: [{ owner, id: theCase.id }],
    });

    const source = observablesStorageMode.getReadSource();
    const decodedCursor = cursor
      ? decodeObservablesCursor({
          cursor,
          source,
          sortField,
          sortOrder,
        })
      : undefined;

    if (source === 'case') {
      const page = pageCaseFieldObservables({
        observables: theCase.attributes.observables ?? [],
        typeKeys,
        sortField,
        sortOrder,
        perPage,
        offset: decodedCursor?.source === 'case' ? decodedCursor.offset : 0,
      });

      return {
        observables: page.observables,
        total: page.total,
        cursor:
          page.nextOffset !== undefined
            ? encodeObservablesCursor({
                source: 'case',
                sortField,
                sortOrder,
                offset: page.nextOffset,
              })
            : undefined,
      };
    }

    const page = await observablesService.findObservables({
      caseId: theCase.id,
      spaceId,
      owner,
      typeKeys,
      sortField,
      sortOrder,
      perPage,
      searchAfter: decodedCursor?.source === 'index' ? decodedCursor.searchAfter : undefined,
    });

    return {
      observables: page.observables,
      total: page.total,
      cursor: page.searchAfter
        ? encodeObservablesCursor({
            source: 'index',
            sortField,
            sortOrder,
            searchAfter: page.searchAfter,
          })
        : undefined,
    };
  } catch (error) {
    throw createCaseError({
      message: `Failed to find observables of case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
