/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { bundle } = require('@kbn/openapi-bundler');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { join, resolve } = require('path');

const OSQUERY_ROOT = resolve(__dirname, '../..');

(async () => {
  await bundle({
    sourceGlob: join(OSQUERY_ROOT, 'common/api/**/*.schema.yaml'),
    outputFilePath: join(
      OSQUERY_ROOT,
      'docs/openapi/serverless/osquery_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['serverless'],
      prototypeDocument: {
        info: {
          title: 'Security Osquery API (Elastic Cloud Serverless)',
          description: 'Run live queries, manage packs and saved queries.',
        },
        tags: [
          {
            name: 'Security Osquery API',
            'x-displayName': 'Security Osquery',
            description: 'Run live queries, manage packs and saved queries.',
          },
        ],
      },
    },
  });

  await bundle({
    sourceGlob: join(OSQUERY_ROOT, 'common/api/**/*.schema.yaml'),
    outputFilePath: join(
      OSQUERY_ROOT,
      'docs/openapi/ess/osquery_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['ess'],
      prototypeDocument: {
        info: {
          title: 'Security Osquery API (Elastic Cloud and self-hosted)',
          description: 'Run live queries, manage packs and saved queries.',
        },
        tags: [
          {
            name: 'Security Osquery API',
            'x-displayName': 'Security Osquery',
            description: 'Run live queries, manage packs and saved queries.',
          },
        ],
      },
    },
  });
})();
