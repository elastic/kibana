/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { generatedGraphQlTypesDir, phoenixClientDir, phoenixConfig } from './constants';

const rulesToDisable = [
  `@typescript-eslint/consistent-type-definitions`,
  `import/no-extraneous-dependencies`,
];

const header =
  '// ⚠️ This file is auto-generated. Do not edit.' +
  '\n' +
  rulesToDisable.map((rule) => `/* eslint-disable ${rule} */`).join('\n');

const add = { content: header };

const config = {
  schema: [
    {
      [`${phoenixConfig.baseUrl}/graphql`]: {
        headers: phoenixConfig.headers,
      },
    },
  ],
  documents: Path.join(phoenixClientDir, 'queries'),
  generates: {
    [Path.join(generatedGraphQlTypesDir, 'schema.json')]: {
      plugins: ['introspection'],
      config: {
        minify: false,
      },
    },
    [Path.join(generatedGraphQlTypesDir, 'graphql.ts')]: {
      plugins: ['typescript', 'typescript-operations', 'typescript-graphql-request', { add }],
      config: {
        rawRequest: false,
      },
    },
  },
  ignoreNoDocuments: true,
};

// eslint-disable-next-line import/no-default-export
export default config;
