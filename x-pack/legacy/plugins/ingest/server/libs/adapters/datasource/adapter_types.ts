/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { AssetType, InputType } from '../../types';

export const RuntimeStoredDatasource = t.intersection([
  t.type({
    name: t.string,
    package: t.any,
    streams: t.array(t.any),
  }),
  t.partial({
    id: t.string,
    read_alias: t.string,
  }),
]);
export type StoredDatasource = t.TypeOf<typeof RuntimeStoredDatasource>;

export const exampleStoredDatasource: StoredDatasource = {
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
  read_alias: 'string',
};
