/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ToolingLog } from '@kbn/tooling-log';
import { dump } from 'js-yaml';
import { writeTempfile } from '../util/file_utils';
import { generateCertificates } from './generate_certificate';
import { getServiceConfigurationFromYaml } from './get_service_configuration';
import { EisCredentials } from './get_eis_credentials';

export interface EisGatewayConfig {
  image: string;
  ports: [number, number];
  mount: {
    acl: string;
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
    };
    task_types: string[];
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
      },
      task_types: ['chat'],
    },
  };

  const aclFilePath = await writeTempfile('acl.yaml', dump(aclContents));

  log.debug(`Wrote ACL file to ${aclFilePath}`);

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
      tls,
      ca,
    },
  };
}
