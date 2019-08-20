/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('../../../../../src/setup_node_env');

const { resolve } = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies, import/no-unresolved
const { generate } = require('graphql-code-generator');

const CONFIG_PATH = resolve(__dirname, 'gql_gen.json');
const OUTPUT_INTROSPECTION_PATH = resolve('common', 'graphql', 'introspection.json');
const OUTPUT_TYPES_PATH = resolve('common', 'graphql', 'types.ts');
const SCHEMA_PATH = resolve(__dirname, 'graphql_schemas.ts');

async function main() {
  await generate(
    {
      args: [],
      config: CONFIG_PATH,
      out: OUTPUT_INTROSPECTION_PATH,
      overwrite: true,
      schema: SCHEMA_PATH,
      template: 'graphql-codegen-introspection-template',
    },
    true
  );
  await generate(
    {
      args: [],
      config: CONFIG_PATH,
      out: OUTPUT_TYPES_PATH,
      overwrite: true,
      schema: SCHEMA_PATH,
      template: 'graphql-codegen-typescript-template',
    },
    true
  );
}

if (require.main === module) {
  main();
}
