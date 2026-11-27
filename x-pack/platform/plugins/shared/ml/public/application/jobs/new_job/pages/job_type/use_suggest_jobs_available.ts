/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useMlKibana, useMlLicenseInfo } from '../../../../contexts/kibana';
import { usePermissionCheck } from '../../../../capabilities/check_capabilities';

const INFERENCE_CONNECTORS_ROUTE = '/internal/inference/connectors';

/**
 * Whether suggesting jobs can work for the current user: they can create jobs, the license is
 * Enterprise and an AI connector has been set up.
 */
export const useSuggestJobsAvailable = (): boolean => {
  const {
    services: { http },
  } = useMlKibana();
  const canCreateJob = usePermissionCheck('canCreateJob');
  const { license } = useMlLicenseInfo();
  const hasEnterpriseLicense = license?.status === 'active' && license.hasAtLeast('enterprise');
  const [hasConnector, setHasConnector] = useState(false);

  useEffect(() => {
    if (!canCreateJob || !hasEnterpriseLicense) return;
    let cancelled = false;
    http
      .get<{ connectors: unknown[] }>(INFERENCE_CONNECTORS_ROUTE)
      .then(({ connectors }) => !cancelled && setHasConnector(connectors.length > 0))
      .catch(() => !cancelled && setHasConnector(false));
    return () => {
      cancelled = true;
    };
  }, [http, canCreateJob, hasEnterpriseLicense]);

  return canCreateJob && hasEnterpriseLicense && hasConnector;
};
