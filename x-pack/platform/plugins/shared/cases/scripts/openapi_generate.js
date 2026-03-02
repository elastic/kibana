/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');
const { generate: openapiGenerate } = require('@kbn/openapi-generator');
const { resolve, join } = require('path');
const { rename } = require('fs/promises');

const CASES_ROOT = resolve(__dirname, '..');

// This script is also run in CI: to track down the scripts that run it in CI, code search for `yarn openapi` in the `.buildkite` top level directory

(async () => {
  // Generate Zod schemas
  await openapiGenerate({
    title: 'Cases API route schemas',
    rootDir: CASES_ROOT,
    sourceGlob: './docs/openapi/bundled-types.schema.yaml',
    templateName: 'zod_operation_schema',
    skipLinting: true,
    schemaNameTransform: 'pascalCase',
    experimentallyImportZodV4: true,
  });

  // Move generated types to `common` because `docs` will be excluded from bundle
  await rename(
    join(CASES_ROOT, 'docs', 'openapi', 'bundled-types.gen.ts'),
    join(CASES_ROOT, 'common', 'bundled-types.gen.ts')
  );
})();
