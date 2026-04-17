/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import {
  TOKEN_BASED_BILLING_DESCRIPTION,
  RESOURCE_BASED_BILLING_DESCRIPTION,
} from '../../../common/translations';
import type { FilterOptions } from '../../types';

export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  provider: [],
  type: [],
};

export const PIPELINE_URL = 'ingest/ingest_pipelines';
export const SERVERLESS_INDEX_MANAGEMENT_URL = 'index_details';

export const SERVICE_PROVIDER_DESCRIPTIONS: Record<string, string> = {
  [ServiceProviderKeys.elastic]: TOKEN_BASED_BILLING_DESCRIPTION,
  [ServiceProviderKeys.elasticsearch]: RESOURCE_BASED_BILLING_DESCRIPTION,
};
