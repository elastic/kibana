/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_FIELD_VALUE_LENGTH } from '@kbn/apm-types';

export {
  MAX_ARRAY_ITEMS,
  MAX_DESCRIPTION_LENGTH,
  MAX_DOCUMENT_VALUE_LENGTH,
  MAX_FIELD_VALUE_LENGTH,
  MAX_FILTERS_LENGTH,
  MAX_JSON_ARRAY_PARAM_LENGTH,
  MAX_KUERY_LENGTH,
  MAX_NUM_BUCKETS,
  MAX_PAGE,
  MAX_PAGE_SIZE,
  MAX_PROFILING_INDEX,
  MAX_QUERY_PARAM_LENGTH,
  MAX_SERVICE_MAP_SERVICES,
} from '@kbn/apm-types';

// Bounds the serviceName path param; matches the `ignore_above` of the `service.name` keyword field.
export const MAX_SERVICE_NAME_LENGTH = MAX_FIELD_VALUE_LENGTH;
