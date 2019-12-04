/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Output, Policy } from '../../../common/types/domain_data';
import { FrameworkUser } from '../../adapters/framework/adapter_types';
import { PolicyLib } from '../../../../ingest/server/libs/policy';
import { OutputsLib } from '../../../../ingest/server/libs/outputs';

export type IngestOutputLib = OutputsLib;
export type IngestPolicyLib = PolicyLib;

export interface IngestPlugin {
  getPolicyOutputByIDs(user: FrameworkUser, ids: string[]): Promise<Output[]>;
  getPolicyById(user: FrameworkUser, id: string): Promise<Policy>;
}

export interface PoliciesRepository {
  getPolicyOutputByIDs(user: FrameworkUser, ids: string[]): Promise<Output[]>;
  get(user: FrameworkUser, id: string): Promise<Policy | null>;
}

export const RuntimeAgentPolicy = t.interface({
  outputs: t.record(
    t.string,
    t.intersection([
      t.type({
        id: t.string,
        type: t.union([
          t.literal('etc'),
          t.literal('log'),
          t.literal('metric/docker'),
          t.literal('metric/system'),
        ]),
      }),
      t.partial({
        url: t.string,
        api_token: t.string,
        username: t.string,
        pass: t.string,
        index_name: t.string,
        ingest_pipeline: t.string,
      }),
      t.UnknownRecord,
    ])
  ),
  streams: t.array(
    t.intersection([
      t.type({
        id: t.string,
        type: t.union([t.literal('es'), t.literal('logstash')]),
      }),
      t.partial({
        output: t.partial({
          overide: t.partial({
            url: t.string,
            api_token: t.string,
            username: t.string,
            pass: t.string,
            index_name: t.string,
            ingest_pipeline: t.string,
          }),
          use_output: t.string,
          index_name: t.string,
        }),
      }),
      t.UnknownRecord,
    ])
  ),
});

export type AgentPolicy = t.TypeOf<typeof RuntimeAgentPolicy>;
