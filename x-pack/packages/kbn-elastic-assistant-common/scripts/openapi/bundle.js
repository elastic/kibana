/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../../src/setup_node_env');
const { bundle } = require('@kbn/openapi-bundler');
// eslint-disable-next-line import/no-nodejs-modules
const { join, resolve } = require('path');

const ELASTIC_ASSISTANT_ROOT = resolve(__dirname, '../..');

(async () => {
  await bundle({
    sourceGlob: join(ELASTIC_ASSISTANT_ROOT, 'impl/schemas/**/*.schema.yaml'),
    outputFilePath: join(
      ELASTIC_ASSISTANT_ROOT,
      'docs/openapi/serverless/elastic_assistant_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['serverless'],
      prototypeDocument: {
        info: {
          title: 'Security AI Assistant API (Elastic Cloud Serverless)',
          description: 'Manage and interact with Security Assistant resources.',
        },
        tags: [
          {
            name: 'Security AI Assistant API',
            description: 'Manage and interact with Security Assistant resources.',
          },
        ],
      },
    },
  });

  await bundle({
    sourceGlob: join(ELASTIC_ASSISTANT_ROOT, 'impl/schemas/**/*.schema.yaml'),
    outputFilePath: join(
      ELASTIC_ASSISTANT_ROOT,
      'docs/openapi/ess/elastic_assistant_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['ess'],
      prototypeDocument: {
        info: {
          title: 'Security AI Assistant API (Elastic Cloud & self-hosted)',
          description: 'Manage and interact with Security Assistant resources.',
        },
        tags: [
          {
            name: 'Security AI Assistant API',
            description: 'Manage and interact with Security Assistant resources.',
          },
        ],
      },
    },
  });
})();
