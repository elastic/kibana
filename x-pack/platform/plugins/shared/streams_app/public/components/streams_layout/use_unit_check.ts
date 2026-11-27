/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import { STREAMS_DEFAULT_UNIT_ID } from '@kbn/streams-plugin/common';
import { streamsUnitIdentifierSchema } from '@kbn/streams-schema';
import { useKibana } from '../../hooks/use_kibana';
import { isNotFoundError } from '../../services/unit_repository';

export type UnitCheck = 'checking' | 'notFound' | 'ready';

const getStatusWithoutRequest = (unitId: string): UnitCheck | undefined => {
  if (!streamsUnitIdentifierSchema.safeParse(unitId).success) {
    return 'notFound';
  }
  // A missing default unit only means nothing was saved yet.
  if (unitId === STREAMS_DEFAULT_UNIT_ID) {
    return 'ready';
  }
  return undefined;
};

/**
 * Whether the unit in the URL exists. Errors other than a 404 are left to the tabs.
 */
export const useUnitCheck = (unitId: string): UnitCheck => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const statusWithoutRequest = getStatusWithoutRequest(unitId);

  const { value: lookup, loading } = useAbortableAsync(
    ({ signal }) => {
      if (statusWithoutRequest) {
        return undefined;
      }
      return streamsRepositoryClient
        .fetch('GET /internal/streams/unit/{id}', { params: { path: { id: unitId } }, signal })
        .then(
          () => ({ unitId, found: true }),
          (error: unknown) => ({ unitId, found: !isNotFoundError(error) })
        );
    },
    [unitId, statusWithoutRequest, streamsRepositoryClient]
  );

  if (statusWithoutRequest) {
    return statusWithoutRequest;
  }
  // The stored lookup can be an older one, for another unit or for this unit before a newer request.
  if (loading || lookup?.unitId !== unitId) {
    return 'checking';
  }
  return lookup.found ? 'ready' : 'notFound';
};
