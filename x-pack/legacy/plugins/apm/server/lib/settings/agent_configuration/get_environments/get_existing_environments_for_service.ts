/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';
import { Setup } from '../../../helpers/setup_request';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT
} from '../../../../../common/elasticsearch_fieldnames';
import { ALL_OPTION_VALUE } from '../../../../../common/agent_configuration_constants';

export async function getExistingEnvironmentsForService({
  serviceName,
  setup
}: {
  serviceName: string | undefined;
  setup: Setup;
}) {
  const { internalClient, config } = setup;

  const bool = serviceName
    ? { filter: [{ term: { [SERVICE_NAME]: serviceName } }] }
    : { must_not: [{ exists: { field: SERVICE_NAME } }] };

  const params = {
    index: config.get<string>('apm_oss.apmAgentConfigurationIndex'),
    body: {
      size: 0,
      query: { bool },
      aggs: {
        environments: {
          terms: {
            field: SERVICE_ENVIRONMENT,
            missing: ALL_OPTION_VALUE,
            size: 50
          }
        }
      }
    }
  };

  const resp = await internalClient.search(params);
  const buckets = idx(resp.aggregations, _ => _.environments.buckets) || [];
  return buckets.map(bucket => bucket.key);
}
