/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { useMlKibana } from '@kbn/ml-kibana-context';
import type { MlCapabilitiesKey } from '@kbn/ml-common-types/capabilities';

/**
 * Check the privilege type and the license to see whether a user has permission to access a feature.
 *
 * @param capability
 */
export function usePermissionCheck<T extends MlCapabilitiesKey | MlCapabilitiesKey[]>(
  capability: T
): T extends MlCapabilitiesKey ? boolean : boolean[] {
  const {
    services: {
      mlServices: { mlCapabilities: mlCapabilitiesService },
    },
  } = useMlKibana();

  // Memoize argument, in case it's an array to preserve the reference.
  const requestedCapabilities = useRef(capability);

  const capabilities = useObservable(
    mlCapabilitiesService.capabilities$,
    mlCapabilitiesService.getCapabilities()
  );
  return useMemo(() => {
    return Array.isArray(requestedCapabilities.current)
      ? requestedCapabilities.current.map((c) => capabilities[c])
      : capabilities[requestedCapabilities.current];
  }, [capabilities]);
}
