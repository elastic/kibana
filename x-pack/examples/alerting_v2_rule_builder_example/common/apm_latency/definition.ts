/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineBuilderType } from '@kbn/alerting-v2-rule-builders';
import { APM_LATENCY_BUILDER_TYPE } from './constants';
import { generateApmLatencyQuery } from './generate_query';
import { apmLatencyBuilderFieldsSchema } from './schema';
import type { ApmLatencyBuilderFields } from './types';

/**
 * Server-side half of the builder: what the rule's parameters may contain, and
 * the query derived from them. Lives in `common` because the browser reuses the
 * schema to validate the form before saving.
 */
export const apmLatencyBuilderTypeDefinition = defineBuilderType<ApmLatencyBuilderFields>({
  type: APM_LATENCY_BUILDER_TYPE,
  builderFieldsSchema: apmLatencyBuilderFieldsSchema,
  generateQuery: generateApmLatencyQuery,
});
