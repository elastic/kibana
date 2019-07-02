/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../helpers/setup_request';
import { PromiseReturnType } from '../../../../typings/common';
import { CentralConfigurationIntake } from './configuration';

export type CMCreateConfigurationAPIResponse = PromiseReturnType<
  typeof createConfiguration
>;
export async function createConfiguration({
  configuration,
  setup
}: {
  configuration: CentralConfigurationIntake;
  setup: Setup;
}) {
  const { client, config } = setup;

  const params = {
    type: '_doc',
    refresh: true,
    index: config.get<string>('apm_oss.cmIndex'),
    body: {
      '@timestamp': Date.now(),
      ...configuration
    }
  };

  return client.index(params);
}
