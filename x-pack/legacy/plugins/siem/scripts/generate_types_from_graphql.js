/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable import/no-extraneous-dependencies */

require('../../../../../src/setup_node_env');

const path = require('path');
const { codegen } = require('@graphql-codegen/core');
const { loadDocuments } = require('graphql-toolkit');

const GRAPHQL_GLOBS = [
  path.join('public', 'containers', '**', '*.gql_query.ts'),
  path.join('common', 'graphql', '**', '*.gql_query.ts'),
];
const OUTPUT_INTROSPECTION_PATH = path.resolve('public', 'graphql', 'introspection.json');
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
const introspectionPlugin = require('@graphql-codegen/introspection');
const typescriptReactApolloPlugin = require('@graphql-codegen/typescript-react-apollo');

async function main() {
  const documents = await loadDocuments(GRAPHQL_GLOBS);

  const output = await codegen({
    schema: parse(printSchema(combinedSchema.default)),
    documents: GRAPHQL_GLOBS,
    overwrite: true,
    filename: OUTPUT_INTROSPECTION_PATH,
    plugins: [
      {
        introspection: {},
      },
    ],
    pluginMap: {
      introspection: introspectionPlugin,
    },
  });

  const output1 = await codegen({
    schema: parse(printSchema(combinedSchema.default)),
    documents: documents.map(item => ({ content: item.document })),
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
          '*/',
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
          apolloReactCommonImportFrom: '@apollo/react-common',
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

  const output2 = await codegen({
    schema: parse(printSchema(combinedSchema.default)),
    documents: documents.map(item => ({ content: item.document })),
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

  fs.writeFileSync(OUTPUT_INTROSPECTION_PATH, output);
  fs.writeFileSync(OUTPUT_CLIENT_TYPES_PATH, output1);
  fs.writeFileSync(OUTPUT_SERVER_TYPES_PATH, output2);
}

if (require.main === module) {
  main();
}
