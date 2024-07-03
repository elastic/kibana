/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { JsonSchemaService } from '../src/json_schema_service';

const pathToOpenAPI = process.argv[2];

run(async ({ log }) => {
  try {
    await new JsonSchemaService(pathToOpenAPI).createSchemaFiles();
    log.success('Schema files created successfully.');
  } catch (e) {
    log.error(`Error creating schema files: ${e}`);
    process.exit(1);
  }
});
