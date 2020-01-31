/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, uniq } from 'lodash';
import { Datasource, Policy } from '../../common/types/domain_data';
import { FrameworkUser } from '../adapters/framework/adapter_types';
import { AgentPolicy, PoliciesRepository } from '../repositories/policies/types';

export class PolicyLib {
  constructor(
    private readonly policyAdapter: PoliciesRepository,
    private readonly soAdapter: any
  ) {}

  private storedDatasourceToAgentStreams(datasources: Datasource[] = []): AgentPolicy['streams'] {
    return flatten(
      datasources.map((ds: Datasource) => {
        return ds.streams.map(stream => ({
          ...stream.input,
          id: stream.id,
          type: stream.input.type as any,
          output: { use_output: stream.output_id },
          ...(stream.config || {}),
        }));
      })
    );
  }

  private outputIDsFromDatasources(datasources: Datasource[] = []): string[] {
    return uniq(
      flatten(
        datasources.map((ds: Datasource) => {
          return ds.streams.map(stream => stream.output_id);
        })
      )
    ) as string[];
  }

  public async getFullPolicy(user: FrameworkUser, id: string): Promise<AgentPolicy | null> {
    let policy;

    try {
      policy = await this.policyAdapter.get(this.soAdapter.getClient(user), id);
    } catch (err) {
      if (!err.isBoom || err.output.statusCode !== 404) {
        throw err;
      }
    }

    if (!policy) {
      return null;
    }

    const agentPolicy = {
      id: policy.id,
      outputs: {
        ...(
          await this.policyAdapter.getPolicyOutputByIDs(
            this.soAdapter.getClient(user),
            this.outputIDsFromDatasources(policy.datasources)
          )
        ).reduce((outputs, { config, ...output }) => {
          outputs[output.id] = {
            ...output,
            type: output.type as any,
            ...config,
          };
          return outputs;
        }, {} as AgentPolicy['outputs']),
      },
      streams:
        policy.datasources && policy.datasources.length
          ? this.storedDatasourceToAgentStreams(policy.datasources)
          : [],
    };

    return agentPolicy;
  }

  public async policyUpdated(
    policyId: string,
    type: 'added' | 'updated' | 'removed',
    payload: Policy | null
  ): Promise<{ success: boolean }> {
    return { success: true };
  }
}
