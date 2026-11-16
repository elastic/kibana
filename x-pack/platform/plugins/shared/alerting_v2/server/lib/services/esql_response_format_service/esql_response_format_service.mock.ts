/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ESQL_RESPONSE_FORMAT, findEsqlResponseFormat } from '../query_service/formats';
import type { EsqlResponseFormatName } from '../query_service/formats';
import type { EsqlResponseFormatServiceContract } from './esql_response_format_service';

/**
 * Stub that reports a fixed format, for tests that exercise a specific ES|QL
 * transport without going through the feature flag service.
 */
export function createEsqlResponseFormatService(
  name: EsqlResponseFormatName = 'json'
): jest.Mocked<EsqlResponseFormatServiceContract> {
  return {
    get: jest.fn().mockReturnValue(findEsqlResponseFormat(name) ?? DEFAULT_ESQL_RESPONSE_FORMAT),
  };
}
