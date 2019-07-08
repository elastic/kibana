/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../helpers/setup_request';

export async function deleteConfiguration({
  configurationId,
  setup
}: {
  configurationId: string;
  setup: Setup;
}) {
  const { client, config } = setup;

  const params = {
    refresh: 'wait_for',
    index: config.get<string>('apm_oss.apmAgentConfigurationIndex'),
    id: configurationId
  };

  return client.delete(params);
}
