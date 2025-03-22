/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ToolingLog } from '@kbn/tooling-log';
import { getServiceConfigurationFromYaml } from './get_service_configuration';

export interface EisModelServerConfig {
  port: number;
  image: string;
}

export async function getEisModelServerConfig({ log }: { log: ToolingLog }) {
  log.debug(`Getting service configuration for eis-model-server`);

  const { version } = await getServiceConfigurationFromYaml<{}>('eis-model-server');

  return {
    port: 8000,
    image: `docker.elastic.co/cloud-ci/k8s-arch/eis-model-server:git-${version}`,
  };
}
