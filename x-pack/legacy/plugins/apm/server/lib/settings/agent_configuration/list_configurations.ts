/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PromiseReturnType } from '../../../../typings/common';
import { Setup } from '../../helpers/setup_request';
import { AgentConfiguration } from './configuration_types';

export type AgentConfigurationListAPIResponse = PromiseReturnType<
  typeof listConfigurations
>;
export async function listConfigurations({ setup }: { setup: Setup }) {
  const { internalClient, indices } = setup;

  const params = {
    index: indices.apmAgentConfigurationIndex,
    size: 200
  };

  const resp = await internalClient.search<AgentConfiguration>(params);
  return resp.hits.hits.map(item => ({
    id: item._id,
    ...item._source
  }));
}
