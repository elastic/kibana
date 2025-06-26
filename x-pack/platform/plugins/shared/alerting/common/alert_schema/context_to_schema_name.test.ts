/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contextToSchemaName } from './context_to_schema_name';

describe('contextToSchemaName', () => {
  it('correctly converts context to schema name', () => {
    expect(contextToSchemaName('observability.logs')).toEqual(`ObservabilityLogsAlert`);
    expect(contextToSchemaName('security')).toEqual(`SecurityAlert`);
  });
});
