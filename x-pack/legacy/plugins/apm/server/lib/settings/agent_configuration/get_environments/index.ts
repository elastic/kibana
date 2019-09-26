/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAllEnvironments } from './get_all_environments';
import { Setup } from '../../../helpers/setup_request';
import { PromiseReturnType } from '../../../../../typings/common';
import { getUnavailableEnvironments } from './get_unavailable_environments';

export type AgentConfigurationEnvironmentsAPIResponse = PromiseReturnType<
  typeof getEnvironments
>;

export async function getEnvironments({
  serviceName,
  setup
}: {
  serviceName: string;
  setup: Setup;
}) {
  const [allEnvironments, unavailableEnvironments] = await Promise.all([
    getAllEnvironments({ serviceName, setup }),
    getUnavailableEnvironments({ serviceName, setup })
  ]);

  return allEnvironments.map(environment => {
    return {
      name: environment,
      available: !unavailableEnvironments.includes(environment)
    };
  });
}
