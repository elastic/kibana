/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseLoadConnectorsResult } from '@kbn/inference-connectors';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { useKibana } from './use_kibana';

const AUTOMATIC_IMPORT_FEATURE_ID = 'automatic_import';

export const useAiConnectors = (): UseLoadConnectorsResult => {
  const { http, settings } = useKibana().services;
  return useLoadConnectors({ http, featureId: AUTOMATIC_IMPORT_FEATURE_ID, settings });
};
