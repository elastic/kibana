/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apmLatencyBuilderFieldsSchema,
  type ApmLatencyBuilderFields,
} from '../../common/apm_latency';

/**
 * Gates the flyout's Next button on the same schema the server validates with,
 * so an incomplete form is caught in the UI rather than on save.
 */
export const isApmLatencyFormValid = (fields: ApmLatencyBuilderFields): boolean =>
  apmLatencyBuilderFieldsSchema.safeParse(fields).success;
