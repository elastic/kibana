/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import EventEmitter from 'events';
import { flatten, unique } from 'lodash';
import { DEFAULT_POLICY_ID } from '../../common/constants';
import { ReturnTypeBulkDelete } from '../../common/types/std_return_format';
import { FrameworkAuthenticatedUser, FrameworkUser } from './adapters/framework/adapter_types';
import { StoredPolicy } from './adapters/policy/adapter_types';
import { PolicyAdapter } from './adapters/policy/default';
import { DatasourcesLib } from './datasources';
import { BackendFrameworkLib } from './framework';
import { OutputsLib } from './outputs';
import { Status, Datasource, Policy } from './types';

export class PolicyLib {
  public events: EventEmitter = new EventEmitter();
  constructor(
    private readonly adapter: PolicyAdapter,
    private readonly libs: {
      framework: BackendFrameworkLib;
      outputs: OutputsLib;
      datasources: DatasourcesLib;
    }
  ) {}

  public async create(withUser: FrameworkUser, name: string, description?: string, label?: string) {
    const info = this.libs.framework.info;
    if (info === null) {
      throw new Error('Could not get version information about Kibana from xpack');
    }

    const newPolicy: StoredPolicy = {
      name,
      description: description || '',
      status: Status.Active,
      datasources: [],
      label: label || name,
      updated_on: new Date().toISOString(),
      updated_by: withUser.kind === 'authenticated' ? withUser.username : 'system (Fleet)',
    };

    return await this.adapter.create(withUser, newPolicy);
  }

  // public async getFullActive(sharedId: string): Promise<PolicyFile> {
  //   const activePolicies = await this.adapter.listVersions(sharedId);

  //   const mostRecentDate = new Date(
  //     Math.max.apply(
  //       null,
  //       activePolicies.map(policy => {
  //         return new Date(policy.updated_on).getTime();
  //       })
  //     )
  //   );

  //   return activePolicies.filter(policy => {
  //     const d = new Date(policy.updated_on);
  //     return d.getTime() >= mostRecentDate.getTime();
  //   })[0];
  // }

  public async get(user: FrameworkUser, id: string): Promise<Policy | null> {
    const policy = await this.adapter.get(user, id);
    if (!policy) {
      return null;
    }
    return {
      id,
      ...policy,
      datasources: await this.libs.datasources.getByIDs(user, policy.datasources || []),
    } as Policy;
  }

  public async list(
    user: FrameworkUser,
    options: {
      kuery?: string;
      page?: number;
      perPage?: number;
      withDatasources?: boolean;
    } = {
      page: 1,
      perPage: 20,
      withDatasources: true,
    }
  ): Promise<{ items: Policy[]; total: number; page: number; perPage: number }> {
    const response = await this.adapter.list(user, options);

    if (options.withDatasources) {
      const dataSourcesIds = unique(
        flatten(response.items.map(policy => policy.datasources || []))
      );
      const datasources: Datasource[] = await this.libs.datasources.getByIDs(user, dataSourcesIds);

      return {
        ...response,
        items: response.items.map(policy => {
          return {
            ...policy,
            datasources: (policy.datasources || []).map(id => {
              return datasources.find(ds => ds.id === id);
            }),
          } as Policy;
        }),
      };
    }

    return {
      ...response,
      items: response.items.map(policy => {
        return {
          ...policy,
          datasources: undefined,
        } as Policy;
      }),
    };
  }

  // public async changeLog(
  //   id: string,
  //   page: number = 1,
  //   perPage: number = 25
  // ): Promise<PolicyFile[]> {
  //   const policies = await this.adapter.listVersions(sharedID, activeOnly, page, perPage);
  //   return policies;
  // }

  public async update(
    user: FrameworkUser,
    id: string,
    policy: Partial<Exclude<Policy, 'id' | 'datasources' | 'updated_by' | 'updated_on'>>
  ): Promise<Policy> {
    const invalidKeys = Object.keys(policy).filter(key =>
      ['id', 'updated_on', 'updated_by', 'datasources'].includes(key)
    );

    if (invalidKeys.length !== 0) {
      throw new Error(
        `Update was called with policy paramaters that are not allowed: ${invalidKeys}`
      );
    }
    const oldPolicy = await this.adapter.get(user, id);

    if (!oldPolicy) {
      throw new Error('Policy not found');
    }

    if (oldPolicy.status === Status.Inactive && policy.status !== Status.Active) {
      throw new Error(`Policy ${id} can not be updated because it is ${oldPolicy.status}`);
    }

    return await this._update(user, id, { ...oldPolicy, ...(policy as StoredPolicy) });
  }

  public async assignDatasource(
    user: FrameworkUser,
    policyID: string,
    datasourceIds: string[]
  ): Promise<Policy> {
    const oldPolicy = await this.adapter.get(user, policyID);
    if (!oldPolicy) {
      throw new Error('Policy not found');
    }

    // TODO ensure IDs of datasources are valid
    return await this._update(user, policyID, {
      ...oldPolicy,
      ...{
        datasources: (oldPolicy.datasources || []).concat(datasourceIds),
      },
    } as StoredPolicy);
  }

  public async unassignDatasource(
    user: FrameworkUser,
    policyID: string,
    datasourceIds: string[]
  ): Promise<Policy> {
    const oldPolicy = await this.adapter.get(user, policyID);
    if (!oldPolicy) {
      throw new Error('Policy not found');
    }

    return await this._update(user, policyID, {
      ...oldPolicy,
      ...{
        datasources: (oldPolicy.datasources || []).filter(id => !datasourceIds.includes(id)),
      },
    } as StoredPolicy);
  }

  public async delete(user: FrameworkUser, ids: string[]): Promise<ReturnTypeBulkDelete> {
    if (ids.includes(DEFAULT_POLICY_ID)) {
      throw new Error('Not allowed (impossible to delete default policy)');
    }

    for (const id of ids) {
      await this.adapter.delete(user, id);
    }

    return {
      results: ids.map(() => ({
        success: true,
        action: 'deleted',
      })),
      success: true,
    };
  }

  // public async changeAgentVersion(policyId: string, version: string) {
  //   const { id, agent_version: agentVersion, ...oldPolicy } = await this.adapter.get(policyId);
  //   const newPolicy = await this.adapter.create({ ...oldPolicy, agent_version: agentVersion });

  //   // TODO: ensure new version is greater then old
  //   // TODO: Ensure new version is a valid version number for agent
  //   // TODO: ensure new version works with current ES version
  //   // TODO: trigger and merge in policy changes from intigrations

  //   await this.adapter.update(newPolicy.id, {
  //     id: newPolicy.id,
  //     ...oldPolicy,
  //     agent_version: version,
  //   });
  //   // TODO fire events for fleet that update was made
  // }

  // public async finishUpdateFrom(policyId: string) {
  //   const oldPolicy = await this.adapter.get(policyId);
  //   await this.adapter.update(policyId, {
  //     ...oldPolicy,
  //     status: 'inactive',
  //   });
  // }

  public async ensureDefaultPolicy() {
    let defaultConfig;
    try {
      defaultConfig = await this.adapter.get(this.libs.framework.internalUser, DEFAULT_POLICY_ID);
    } catch (err) {
      if (!err.isBoom || err.output.statusCode !== 404) {
        throw err;
      }
    }

    if (!defaultConfig) {
      const info = this.libs.framework.info;
      if (info === null) {
        throw new Error('Could not get version information about Kibana from xpack');
      }
      const newDefaultPolicy: StoredPolicy = {
        name: 'Default policy',
        description: 'Default policy created by Kibana',
        status: Status.Active,
        datasources: [],
        updated_on: new Date().toISOString(),
        updated_by: 'Fleet (system action)',
      };

      await this.adapter.create(this.libs.framework.internalUser, newDefaultPolicy, {
        id: DEFAULT_POLICY_ID,
      });
    }
  }

  private async _update(user: FrameworkUser, id: string = 'new', policy: StoredPolicy) {
    await this.adapter.update(user, id, {
      ...policy,
      updated_on: new Date().toString(),
      updated_by: (user as FrameworkAuthenticatedUser).username || 'Fleet (system action)',
    });
    // TODO fire events for fleet that update was made

    // TODO create audit/history log
    // const newPolicy = await this.adapter.create(policyData);

    return policy as Policy;
  }
}
