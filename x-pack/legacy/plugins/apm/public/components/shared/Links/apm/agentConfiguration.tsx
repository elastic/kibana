/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAPMHref } from './APMLink';
import { fromQuery, toQuery } from '../url_helpers';
import { Config } from '../../../app/Settings/AgentConfigurations';

export function editAgentConfigurationHref(
  search: string,
  configService: Config['service']
) {
  const nextSearch = fromQuery({
    ...toQuery(search),
    name: configService.name,
    environment: configService.environment
  });

  return getAPMHref('/settings/agent-configuration/create', nextSearch);
}

export function createAgentConfigurationHref(search: string) {
  return editAgentConfigurationHref(search, {});
}
