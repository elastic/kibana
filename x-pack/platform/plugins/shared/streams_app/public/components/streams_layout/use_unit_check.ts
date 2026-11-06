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
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { isNotFoundError } from '../../services/unit_repository';

export type UnitCheck = 'checking' | 'notFound' | 'ready';

interface UnitLookup {
  unitId: string;
  found: boolean;
}

const getStatusWithoutRequest = (unitId: string, canOpenV2: boolean): UnitCheck | undefined => {
  if (!canOpenV2) {
    return 'ready';
  }
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
 * Whether the unit in the URL exists. Only ids other than `default` that pass the unit id grammar
 * cost a request, and any error other than a 404 is left to the tabs.
 */
export const useUnitCheck = (unitId: string): UnitCheck => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const {
    access: { v2: canOpenV2 },
  } = useStreamsPrivileges();
  const statusWithoutRequest = getStatusWithoutRequest(unitId, canOpenV2);

  const { value: lookup, loading } = useAbortableAsync(
    ({ signal }): UnitLookup | Promise<UnitLookup> => {
      if (statusWithoutRequest) {
        return { unitId, found: statusWithoutRequest === 'ready' };
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
