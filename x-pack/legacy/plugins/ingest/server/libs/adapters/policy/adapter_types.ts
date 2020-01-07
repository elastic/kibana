/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Status, AssetType, InputType, Policy } from '../../../../common/types/domain_data';

/**
 * The entire config for the Beats agent, including all assigned data source config outputs
 * along with agent-wide configuration values
 */

export const RuntimeStoredPolicy = t.intersection([
  t.type({
    name: t.string,
    status: t.union([t.literal('active'), t.literal('inactive')]),
    updated_on: t.string,
    updated_by: t.string,
  }),
  t.partial({
    id: t.string,
    datasources: t.array(t.string), // IDs
    description: t.string,
    label: t.string, // the key formerly known as "use case"
  }),
]);
export type StoredPolicy = t.TypeOf<typeof RuntimeStoredPolicy>;

export const exampleStoredPolicy: Policy = {
  id: 'policy_example',
  name: 'Example Policy',
  datasources: [
    {
      name: 'prod_west',
      package: {
        name: 'coredns',
        version: '1.3.1',
        description:
          'CoreDNS logs and metrics integration.\nThe CoreDNS integrations allows to gather logs and metrics from the CoreDNS DNS server to get better insights.\n',
        title: 'CoreDNS',
        assets: [{ id: 'string', type: AssetType.IndexTemplate }],
      },
      streams: [
        {
          id: 'string',
          input: {
            type: InputType.Etc,
            config: { paths: '/var/log/*.log' },
            ingest_pipelines: ['string'],
            id: 'string',
            index_template: 'string',
            ilm_policy: 'string',
            fields: [{}],
          },
          config: { metricsets: ['container', 'cpu'] },
          output_id: 'default',
          processors: ['string'],
        },
      ],
      id: 'string',
      read_alias: 'string',
    },
  ],
  updated_on: new Date().toISOString(),
  updated_by: 'username',
  description: 'string',
  status: Status.Active,
};
