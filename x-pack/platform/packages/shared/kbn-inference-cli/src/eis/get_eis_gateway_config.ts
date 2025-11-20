/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ToolingLog } from '@kbn/tooling-log';
import { dump } from 'js-yaml';
import { writeTempfile } from '../util/file_utils';
import { generateCertificates } from './generate_certificate';
import { getServiceConfigurationFromYaml } from './get_service_configuration';
import type { EisCredentials } from './get_eis_credentials';

export interface EisGatewayConfig {
  image: string;
  ports: [number, number];
  mount: {
    acl: string;
    metadata: string;
    tls: {
      cert: string;
      key: string;
    };
    ca: {
      cert: string;
    };
  };
  credentials: EisCredentials;
  model: {
    id: string;
  };
}

const EIS_CHAT_MODEL_NAME = `rainbow-sprinkles`;

interface AccessControlListConfig {
  [x: string]: {
    allow_cloud_trials: boolean;
    hosted: {
      mode: 'allow' | 'deny';
      accounts: string[];
    };
    serverless: {
      mode: 'allow' | 'deny';
      organizations: string[];
      allow_all_for_project_type: {
        elasticsearch: boolean;
        observability: boolean;
        security: boolean;
      };
    };
  };
}

export async function getEisGatewayConfig({
  log,
  signal,
  credentials,
}: {
  log: ToolingLog;
  signal: AbortSignal;
  credentials: EisCredentials;
}): Promise<EisGatewayConfig> {
  log.debug(`Getting EIS Gateway config`);

  const { version } = await getServiceConfigurationFromYaml<{}>('eis-gateway');

  // This file is meant for LOCAL DEVELOPMENT ONLY!
  // We have different versions of this in serverless-gitops via the
  // Helm value `acl` and the ConfigMap in helm/templates/acl.yaml.
  const aclContents: AccessControlListConfig = {
    [EIS_CHAT_MODEL_NAME]: {
      allow_cloud_trials: true,
      hosted: {
        mode: 'deny',
        accounts: [],
      },
      serverless: {
        mode: 'deny',
        organizations: [],
        allow_all_for_project_type: {
          elasticsearch: false,
          observability: false,
          security: false,
        },
      },
    },
    elser_model_2: {
      allow_cloud_trials: true,
      hosted: {
        mode: 'deny',
        accounts: [],
      },
      serverless: {
        mode: 'deny',
        organizations: [],
        allow_all_for_project_type: {
          elasticsearch: false,
          observability: false,
          security: false,
        },
      },
    },
    'jina-embeddings-v3': {
      allow_cloud_trials: true,
      hosted: {
        mode: 'deny',
        accounts: [],
      },
      serverless: {
        mode: 'deny',
        organizations: [],
        allow_all_for_project_type: {
          elasticsearch: false,
          observability: false,
          security: false,
        },
      },
    },
  };

  const aclFilePath = await writeTempfile('acl.yaml', dump(aclContents));

  log.debug(`Wrote ACL file to ${aclFilePath}`);

  // This file is meant for LOCAL DEVELOPMENT ONLY!
  // Based on https://github.com/elastic/eis-gateway/blob/main/endpoint-metadata/endpoint-metadata.yaml
  const endpointMetadataContents: any = {
    inference_endpoints: [
      {
        id: '.rainbow-sprinkles-elastic',
        model_name: 'rainbow-sprinkles',
        task_types: {
          elasticsearch: 'chat_completion',
          eis: 'chat',
        },
        status: 'ga',
        properties: ['multilingual'],
        release_date: '2025-06-23',
        end_of_life_date: '2026-04-15',
      },
      {
        id: '.elser-2-elastic',
        model_name: 'elser_model_2',
        task_types: {
          elasticsearch: 'sparse_embedding',
          eis: 'embed/text/sparse',
        },
        status: 'preview',
        properties: ['english'],
        release_date: '2025-10-01',
        configuration: {
          chunking_settings: {
            strategy: 'sentence',
            max_chunk_size: 250,
            sentence_overlap: 1,
          },
        },
      },
      {
        id: '.jina-embeddings-v3',
        model_name: 'jina-embeddings-v3',
        task_types: {
          elasticsearch: 'text_embedding',
          eis: 'embed/text/dense',
        },
        status: 'beta',
        properties: ['multilingual', 'open-weights'],
        release_date: '2025-11-30',
        configuration: {
          similarity: 'cosine',
          dimensions: 1024,
          element_type: 'float',
          chunking_settings: {
            strategy: 'sentence',
            max_chunk_size: 250,
            sentence_overlap: 1,
          },
        },
      },
    ],
  };

  const endpointMetadataFilePath = await writeTempfile(
    'endpoint_metadata.yaml',
    dump(endpointMetadataContents)
  );

  log.debug(`Wrote endpoint metadata file to ${endpointMetadataFilePath}`);

  const { tls, ca } = await generateCertificates({
    log,
  });

  return {
    ports: [8443, 8051],
    credentials,
    image: `docker.elastic.co/cloud-ci/k8s-arch/eis-gateway:git-${version}`,
    model: {
      id: EIS_CHAT_MODEL_NAME,
    },
    mount: {
      acl: aclFilePath,
      metadata: endpointMetadataFilePath,
      tls,
      ca,
    },
  };
}
