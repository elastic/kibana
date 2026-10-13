/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import { INTEGRATIONS_PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { useKibana } from '../common/lib/kibana';
import { OSQUERY_INTEGRATION_NAME } from '../../common';

export const useManageIntegration = () => {
  const {
    application: { getUrlForApp, navigateToApp },
  } = useKibana().services;

  const integrationPath = pagePathGetters.integration_details_policies({
    pkgkey: OSQUERY_INTEGRATION_NAME,
  })[1];

  const href = useMemo(
    () =>
      getUrlForApp(INTEGRATIONS_PLUGIN_ID, {
        path: integrationPath,
      }),
    [getUrlForApp, integrationPath]
  );

  const navigate = useCallback(() => {
    navigateToApp(INTEGRATIONS_PLUGIN_ID, {
      path: integrationPath,
    });
  }, [integrationPath, navigateToApp]);

  return { href, navigate };
};
