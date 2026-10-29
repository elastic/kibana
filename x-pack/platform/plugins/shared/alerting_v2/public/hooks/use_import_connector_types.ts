/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { ImportAlertsConnectorFeatureId } from '@kbn/actions-plugin/common';
import { fetchConnectorTypes } from '@kbn/alerts-ui-shared/src/common/apis';
import type { ActionType } from '@kbn/actions-types';
import { importKeys } from './query_key_factory';

/**
 * Connector types that declare the `importAlerts` capability, so they can be an import source.
 * The list is the same for the whole session, so it is cached for a long time.
 */
export const useImportConnectorTypes = () => {
  const http = useService(CoreStart('http'));

  return useQuery<ActionType[], Error>({
    queryKey: importKeys.connectorTypes(),
    queryFn: () => fetchConnectorTypes({ http, featureId: ImportAlertsConnectorFeatureId }),
    staleTime: 5 * 60 * 1000,
  });
};
