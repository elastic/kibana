/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { command } from 'execa';
import { run } from '@kbn/dev-cli-runner';
import { generatedGraphQlTypesDir } from './constants';

/**
 * This script generates types from the Phoenix schema. Given we
 * have a single query at the moment (for upserting a dataset),
 * we don't use those types, but the script is still here to
 * make sure that we can validate any changes that we make.
 *
 * It will output files to `kibana_phoenix_client/__generated__`.
 *
 * If we do decide to use it we can:
 * - write our queries in *.graphql files
 * - add a `graphql.config.json` file referring to the generated
 * `schema.json` and all `*.graphql` files.
 */
run(async ({ log }) => {
  const packages = [
    '@graphql-codegen/typescript',
    '@graphql-codegen/typescript-operations',
    '@graphql-codegen/typescript-graphql-request',
    '@graphql-codegen/typed-document-node',
    '@graphql-codegen/introspection',
    '@graphql-codegen/cli',
    'graphql',
  ].join(' ');

  log.info('Installing transient graphql dependencies');

  await command(`yarn add --silent --no-lockfile --ignore-workspace-root-check ${packages}`);
  try {
    await command(
      `yarn run graphql-codegen --config ${Path.join(__dirname, './codegen_config.ts')}`,

      {
        stdio: 'inherit' as const,
        env: { ...process.env, FORCE_COLOR: '1' },
      }
    );

    log.info(`Linting generated files: ${generatedGraphQlTypesDir}`);
    await command(`node scripts/eslint --fix ${Path.join(generatedGraphQlTypesDir, '**/*.ts')}`, {
      stdio: 'ignore',
    });
  } finally {
    log.info('Uninstalling transient graphql dependencies');
    await command(`yarn remove --silent --no-lockfile --ignore-workspace-root-check ${packages}`);
  }
});
