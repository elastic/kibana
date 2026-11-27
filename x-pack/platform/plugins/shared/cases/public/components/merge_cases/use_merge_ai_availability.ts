/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { InferenceConnector } from '@kbn/inference-common';
import { useKibana } from '../../common/lib/kibana';
import { useLicense } from '../../common/use_license';
import { inferenceKeys } from '../../containers/constants';

/** Connectors rarely change while the flyout is open. */
const CONNECTORS_STALE_TIME_MS = 5 * 60 * 1000;

/**
 * Whether the Conflicts step can offer "Resolve with AI": an Enterprise license, access to
 * connectors, and at least one AI connector.
 */
export const useMergeAiAvailability = (): boolean => {
  const {
    services: {
      inference,
      application: { capabilities },
    },
  } = useKibana();
  const license = useLicense();
  const canUseConnectors =
    inference != null && license.isAtLeastEnterprise() && capabilities.actions?.show === true;

  const { data: connectors } = useQuery<InferenceConnector[]>(
    inferenceKeys.getConnectors(),
    () => (inference != null ? inference.getConnectors() : Promise.resolve([])),
    { enabled: canUseConnectors, staleTime: CONNECTORS_STALE_TIME_MS, retry: false }
  );

  return canUseConnectors && (connectors?.length ?? 0) > 0;
};
