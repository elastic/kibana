/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');
const { bundle } = require('@kbn/openapi-bundler');
// eslint-disable-next-line import/no-nodejs-modules
const { join, resolve } = require('path');

const ANONYMIZATION_COMMON_ROOT = resolve(__dirname, '../..');

(async () => {
  const sourceGlob = join(ANONYMIZATION_COMMON_ROOT, 'impl/schemas/routes/**/*.schema.yaml');

  await bundle({
    sourceGlob,
    outputFilePath: join(
      ANONYMIZATION_COMMON_ROOT,
      'docs/openapi/serverless/anonymization_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['serverless'],
      prototypeDocument: {
        info: {
          title: 'Anonymization API (Elastic Cloud Serverless)',
          description: 'Manage anonymization profiles and replacements.',
        },
        tags: [
          {
            name: 'Anonymization API',
            'x-displayName': 'Anonymization',
            description: 'Manage anonymization profiles and replacements.',
          },
        ],
      },
    },
  });

  await bundle({
    sourceGlob,
    outputFilePath: join(
      ANONYMIZATION_COMMON_ROOT,
      'docs/openapi/ess/anonymization_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['ess'],
      prototypeDocument: {
        info: {
          title: 'Anonymization API (Elastic Cloud & self-hosted)',
          description: 'Manage anonymization profiles and replacements.',
        },
        tags: [
          {
            name: 'Anonymization API',
            'x-displayName': 'Anonymization',
            description: 'Manage anonymization profiles and replacements.',
          },
        ],
      },
    },
  });
})();
