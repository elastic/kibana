/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable import/no-extraneous-dependencies */

require('../../../../../src/setup_node_env');

const path = require('path');
const { codegen } = require('@graphql-codegen/core');
const { loadDocuments } = require('@graphql-toolkit/core');
const { GraphQLFileLoader } = require('@graphql-toolkit/graphql-file-loader');
const { CodeFileLoader } = require('@graphql-toolkit/code-file-loader');

const GRAPHQL_GLOBS = [
  path.join('public', 'containers', '**', '*.gql_query.ts'),
  path.join('common', 'graphql', '**', '*.gql_query.ts'),
];
const OUTPUT_CLIENT_TYPES_PATH = path.resolve('public', 'graphql', 'types.tsx');
const OUTPUT_SERVER_TYPES_PATH = path.resolve('server', 'graphql', 'types.ts');
const combinedSchema = require('./combined_schema');

const { printSchema, parse } = require('graphql');
const fs = require('fs');
const addPlugin = require('@graphql-codegen/add');
const typescriptPlugin = require('@graphql-codegen/typescript');
const typescriptOperationsPlugin = require('@graphql-codegen/typescript-operations');
const typescriptResolversPlugin = require('@graphql-codegen/typescript-resolvers');
const typescriptCompatibilityPlugin = require('@graphql-codegen/typescript-compatibility');
const typescriptReactApolloPlugin = require('@graphql-codegen/typescript-react-apollo');

async function main() {
  const documents = await loadDocuments(GRAPHQL_GLOBS, {
    loaders: [new GraphQLFileLoader(), new CodeFileLoader()],
  });

  const client = await codegen({
    schema: parse(printSchema(combinedSchema.default)),
    documents,
    overwrite: true,
    filename: OUTPUT_CLIENT_TYPES_PATH,
    primitives: {
      String: 'string',
      Int: 'number',
      Float: 'number',
      Boolean: 'boolean',
      ID: 'string',
    },
    config: {
      dedupeOperationSuffix: false,
      preResolveTypes: true,
      avoidOptionals: false,
      namingConvention: {
        typeNames: 'change-case#pascalCase',
        enumValues: 'keep',
      },
      contextType: 'SiemContext',
      scalars: {
        ToStringArray: 'string[]',
        ToNumberArray: 'number[]',
        ToDateArray: 'string[]',
        ToBooleanArray: 'boolean[]',
        Date: 'string',
      },
    },
    plugins: [
      {
        add: [
          '/*',
          ' * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one',
          ' * or more contributor license agreements. Licensed under the Elastic License;',
          ' * you may not use this file except in compliance with the Elastic License.',
          ' */',
          '',
          '/* tslint:disable */',
          '/* eslint-disable */',
          '',
        ].join('\n'),
      },
      {
        typescript: {},
      },
      {
        'typescript-operations': {},
      },
      {
        'typescript-react-apollo': {
          apolloReactComponentsImportFrom: '@apollo/react-components',
          reactApolloVersion: 3,
          withHooks: true,
          withHOC: false,
        },
      },
      {
        'typescript-compatibility': {},
      },
    ],
    pluginMap: {
      add: addPlugin,
      typescript: typescriptPlugin,
      'typescript-operations': typescriptOperationsPlugin,
      'typescript-react-apollo': typescriptReactApolloPlugin,
      'typescript-compatibility': typescriptCompatibilityPlugin,
    },
  });

  const server = await codegen({
    schema: parse(printSchema(combinedSchema.default)),
    documents,
    overwrite: true,
    filename: OUTPUT_SERVER_TYPES_PATH,
    primitives: {
      String: 'string',
      Int: 'number',
      Float: 'number',
      Boolean: 'boolean',
      ID: 'string',
    },
    config: {
      declarationKind: 'interface',
      useIndexSignature: true,
      skipTypename: true,
      avoidOptionals: false,
      preResolveTypes: true,
      namingConvention: {
        typeNames: 'change-case#pascalCase',
        enumValues: 'keep',
      },
      contextType: 'SiemContext',
      scalars: {
        ToStringArray: 'string[] | string',
        ToNumberArray: 'number[] | number',
        ToDateArray: 'string[] | string',
        ToBooleanArray: 'boolean[] | boolean',
        Date: 'string',
      },
    },
    plugins: [
      {
        add: [
          '/*',
          ' * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one',
          ' * or more contributor license agreements. Licensed under the Elastic License;',
          ' * you may not use this file except in compliance with the Elastic License.',
          '*/',
          '',
          '/* tslint:disable */',
          '/* eslint-disable */',
          '',
          `import { SiemContext } from '../lib/types';`,
          '',
        ].join('\n'),
      },
      {
        typescript: {},
      },
      {
        'typescript-resolvers': {},
      },
    ],
    pluginMap: {
      add: addPlugin,
      typescript: typescriptPlugin,
      'typescript-resolvers': typescriptResolversPlugin,
    },
  });

  fs.writeFileSync(OUTPUT_CLIENT_TYPES_PATH, client);
  fs.writeFileSync(OUTPUT_SERVER_TYPES_PATH, server);
}

if (require.main === module) {
  main();
}
