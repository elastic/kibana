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

const ELASTIC_ASSISTANT_ROOT = resolve(__dirname, '../..');

(async () => {
  const sourceGlob = join(
    ELASTIC_ASSISTANT_ROOT,
    'impl/schemas/attack_discovery/routes/public/**/*.schema.yaml'
  );

  await bundle({
    sourceGlob,
    outputFilePath: join(
      ELASTIC_ASSISTANT_ROOT,
      'docs/openapi/serverless/attack_discovery_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['serverless'],
      prototypeDocument: {
        info: {
          title: 'Security Attack discovery API (Elastic Cloud Serverless)',
          description:
            'Use the Attack discovery APIs to generate and manage Attack discoveries. Attack Discovery leverages large language models (LLMs) to analyze alerts in your environment and identify threats. Each "discovery" represents a potential attack and describes relationships among multiple alerts to tell you which users and hosts are involved, how alerts correspond to the MITRE ATT&CK matrix, and which threat actor might be responsible.',
        },
        tags: [
          {
            name: 'Security Attack discovery API',
            'x-displayName': 'Security Attack discovery',
            description:
              'Use the Attack discovery APIs to generate and manage Attack discoveries. Attack Discovery leverages large language models (LLMs) to analyze alerts in your environment and identify threats. Each "discovery" represents a potential attack and describes relationships among multiple alerts to tell you which users and hosts are involved, how alerts correspond to the MITRE ATT&CK matrix, and which threat actor might be responsible.',
          },
        ],
      },
    },
  });

  await bundle({
    sourceGlob,
    outputFilePath: join(
      ELASTIC_ASSISTANT_ROOT,
      'docs/openapi/ess/attack_discovery_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['ess'],
      prototypeDocument: {
        info: {
          title: 'Security Attack discovery API (Elastic Cloud & self-hosted)',
          description:
            'Use the Attack discovery APIs to generate and manage Attack discoveries. Attack Discovery leverages large language models (LLMs) to analyze alerts in your environment and identify threats. Each "discovery" represents a potential attack and describes relationships among multiple alerts to tell you which users and hosts are involved, how alerts correspond to the MITRE ATT&CK matrix, and which threat actor might be responsible.',
        },
        tags: [
          {
            name: 'Security Attack discovery API',
            'x-displayName': 'Security Attack discovery',
            description:
              'Use the Attack discovery APIs to generate and manage Attack discoveries. Attack Discovery leverages large language models (LLMs) to analyze alerts in your environment and identify threats. Each "discovery" represents a potential attack and describes relationships among multiple alerts to tell you which users and hosts are involved, how alerts correspond to the MITRE ATT&CK matrix, and which threat actor might be responsible.',
          },
        ],
      },
    },
  });
})();
