/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMlKibana } from '@kbn/ml-kibana-context';
import useObservable from 'react-use/lib/useObservable';

/**
 * Check whether upgrade mode has been set.
 */
export function useUpgradeCheck(): boolean {
  const {
    services: {
      mlServices: { mlCapabilities: mlCapabilitiesService },
    },
  } = useMlKibana();

  const isUpgradeInProgress = useObservable(
    mlCapabilitiesService.isUpgradeInProgress$(),
    mlCapabilitiesService.isUpgradeInProgress()
  );
  return isUpgradeInProgress ?? false;
}
