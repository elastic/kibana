/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';
import type { EsqlResponseFormatServiceContract } from './esql_response_format_service';

/**
 * EsqlResponseFormatService — resolves the ES|QL response format the rule
 * executor uses from the `alertingV2.esqlResponseFormat` feature flag.
 */
export const EsqlResponseFormatServiceToken = createToken<EsqlResponseFormatServiceContract>(
  'alerting_v2.EsqlResponseFormatService'
);
