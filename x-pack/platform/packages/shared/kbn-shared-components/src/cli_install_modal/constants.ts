/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CLI_INSTALL_COMMAND = 'npm install -g @elastic/cli';
export const CLI_VERIFY_COMMAND = 'elastic es info';
export const CLI_CONTEXT_NAME = 'my-deployment';
export const CLI_API_KEY_PLACEHOLDER = '<your-api-key>';
export const CLI_ES_URL_PLACEHOLDER = '<your-elasticsearch-url>';
export const CLI_REPO_URL = 'https://github.com/elastic/cli';
export const CLI_COMMAND_REFERENCE_URL = 'https://github.com/elastic/cli#commands';

export const buildCliConnectCommand = (elasticsearchUrl: string | null): string =>
  [
    `elastic config context add ${CLI_CONTEXT_NAME} \\`,
    `   --es-url ${elasticsearchUrl ?? CLI_ES_URL_PLACEHOLDER} \\`,
    `   --es-api-key ${CLI_API_KEY_PLACEHOLDER}`,
  ].join('\n');
