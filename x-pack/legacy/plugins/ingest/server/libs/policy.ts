/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { assign, omit } from 'lodash';
import uuidv4 from 'uuid/v4';
import { PolicyAdapter } from './adapters/policy/default';
import { BackendFrameworkLib } from './framework';
import {
  PolicyFile,
  NewPolicyFile,
  FullPolicyFile,
  Datasource,
} from './adapters/policy/adapter_types';
import { FrameworkAuthenticatedUser } from './adapters/framework/adapter_types';
import { NewDatasource } from './adapters/policy/adapter_types';

export class PolicyLib {
  constructor(
    private readonly adapter: PolicyAdapter,
    private readonly libs: {
      framework: BackendFrameworkLib;
    }
  ) {}
  public async create(withUser: FrameworkAuthenticatedUser, name: string, description?: string) {
    const info = this.libs.framework.info;
    if (info === null) {
      throw new Error('Could not get version information about Kibana from xpack');
    }

    const newPolicy: NewPolicyFile = {
      name,
      description: description || '',
      status: 'active',
      monitoring_enabled: true,
      shared_id: `shared-${uuidv4()}`,
      version: 0,
      agent_version: info.kibana.version,
      data_sources: [],
      created_on: new Date().toDateString(),
      created_by: withUser.username,
      updated_on: new Date().toDateString(),
      updated_by: withUser.username,
    };

    // TODO io-ts validations, need custom reporter

    return await this.adapter.create(newPolicy);
  }

  public async getFullActive(sharedId: string): Promise<PolicyFile> {
    const activePolicies = await this.adapter.listVersions(sharedId);

    const mostRecentDate = new Date(
      Math.max.apply(
        null,
        activePolicies.map(policy => {
          return new Date(policy.updated_on).getTime();
        })
      )
    );

    return activePolicies.filter(policy => {
      const d = new Date(policy.updated_on);
      return d.getTime() >= mostRecentDate.getTime();
    })[0];
  }

  public async get(id: string): Promise<PolicyFile> {
    const policy = await this.adapter.get(id);
    return policy;
  }

  public async getFull(id: string): Promise<FullPolicyFile> {
    const policy = await this.adapter.get(id);
    for (let i = 0; i < policy.data_sources.length; i++) {
      // TODO page through vs one large query as this will break if there are more then 10k inputs
      // a likely case for uptime
      // const fullInputs = await this.adapter.getInputsById(policy.data_sources[i].inputs, 1, 10000);

      if (policy.data_sources[i]) {
        // hard coded to mock data for now
        (policy.data_sources[i] as any).inputs = [
          {
            id: uuidv4(),
            data_source_id: policy.data_sources[i].uuid,
            meta: {},
            foo: 'bar', // JSON from the `other` field, gets flattened to top level when returned via REST API
          },
        ];
      }
    }

    return policy as FullPolicyFile;
  }

  public async list(page: number = 1, perPage: number = 25): Promise<PolicyFile[]> {
    const policys = await this.adapter.list(page, perPage);
    return policys;
  }

  public async listVersions(
    sharedID: string,
    activeOnly = true,
    page: number = 1,
    perPage: number = 25
  ): Promise<PolicyFile[]> {
    const policys = await this.adapter.listVersions(sharedID, activeOnly, page, perPage);
    return policys;
  }

  public async update(
    id: string,
    policy: Partial<{
      name: string;
      description: string;
      monitoring_enabled: boolean;
    }>
  ): Promise<{ id: string; version: number; shared_id: string }> {
    const invalidKeys = Object.keys(policy).filter(
      key => !['name', 'description', 'monitoring_enabled'].includes(key)
    );

    if (invalidKeys.length !== 0) {
      throw new Error(
        `Update was called with policy paramaters that are not allowed: ${invalidKeys}`
      );
    }
    const oldPolicy = await this.adapter.get(id);

    if (oldPolicy.status !== 'active') {
      throw new Error(
        `Policy ${oldPolicy.id} can not be updated becuase it is ${oldPolicy.status}`
      );
    }

    const newPolicy = await this._update(oldPolicy, policy);
    return newPolicy;
  }

  public async delete(sharedId: string): Promise<{ success: boolean }> {
    // TODO Low priority - page through vs one large query as this will break if there are more then 10k past versions
    const versions = await this.listVersions(sharedId, false, 1, 10000);

    // TODO bulk delete
    for (const version of versions) {
      await this.adapter.deleteVersion(version.id);
    }

    return {
      success: true,
    };
  }

  public async deleteVersion(id: string): Promise<{ success: boolean }> {
    return await this.adapter.deleteVersion(id);
  }

  public async createNewPolicyFrom(policyId: string, name: string, description: string = '') {
    const { id, data_sources: dataSources, ...oldPolicy } = await this.adapter.get(policyId);
    const newPolicy = await this.adapter.create({
      ...oldPolicy,
      data_sources: [],
    });

    const newDSs: PolicyFile['data_sources'] = [];
    for (const ds of dataSources) {
      // TODO page through vs one large query as this will break if there are more then 10k inputs
      // a likely case for uptime
      const oldInputs = await this.adapter.getInputsById(ds.inputs, 1, 10000);
      const newInputs = await this.adapter.addInputs(
        oldInputs.map(input => ({
          ...input,
          id: uuidv4(),
          policy_id: newPolicy.id,
        }))
      );

      newDSs.push({ ...ds, uuid: uuidv4(), inputs: newInputs });
    }

    await this.adapter.update(newPolicy.id, {
      ...oldPolicy,
      id: newPolicy.id,
      data_sources: newDSs,
      shared_id: `shared-${uuidv4()}`,
      name,
      description,
    });
    // TODO fire events for fleet that update was made
  }

  public async upgrade(policyId: string, version: string) {
    const { id, agent_version: agentVersion, ...oldPolicy } = await this.adapter.get(policyId);
    const newPolicy = await this.adapter.create({ ...oldPolicy, agent_version: agentVersion });

    // TODO: ensure new version is greater then old
    // TODO: Ensure new version is a valid version number for agent
    // TODO: ensure new version works with current ES version
    // TODO: trigger and merge in policy changes from intigrations

    await this.adapter.update(newPolicy.id, {
      id: newPolicy.id,
      ...oldPolicy,
      agent_version: version,
    });
    // TODO fire events for fleet that update was made
  }

  public async finishUpdateFrom(policyId: string) {
    const oldPolicy = await this.adapter.get(policyId);
    await this.adapter.update(policyId, {
      ...oldPolicy,
      status: 'inactive',
    });
  }

  public async rollForward(
    id: string
  ): Promise<{ id: string; version: number; shared_id: string }> {
    const oldPolicy = await this.adapter.get(id);

    const newPolicyInfo = await this._update(oldPolicy, {});
    return {
      id: newPolicyInfo.id,
      version: newPolicyInfo.version,
      shared_id: newPolicyInfo.shared_id,
    };
  }

  /**
   * request* because in the future with an approval flow it will not directly make the change
   */
  public async requestAddDataSource(policyId: string, datasource: NewDatasource) {
    const oldPolicy = await this.adapter.get(policyId);

    if (oldPolicy.status !== 'active') {
      throw new Error(
        `Policy ${oldPolicy.id} can not be updated becuase it is ${oldPolicy.status}`
      );
    }
    const uuid = uuidv4();

    // TODO: these types are really messed up... idk why...
    const editedDS: NewDatasource & {
      inputs: string[];
      queue?: string;
    } = {
      ...datasource,
      queue: JSON.stringify(datasource.queue || ''),
      inputs: (await this.adapter.addInputs(
        datasource.inputs.map(input => {
          return {
            other: JSON.stringify(input),
            data_source_id: uuid,
          };
        })
      )) as any[],
    } as any;

    const newPolicyInfo = await this._update(oldPolicy, {
      data_sources: [...oldPolicy.data_sources, { uuid, ...editedDS } as Datasource],
    });

    return {
      id: newPolicyInfo.id,
      version: newPolicyInfo.version,
      shared_id: newPolicyInfo.shared_id,
    };
  }

  /**
   * request* because in the future with an approval flow it will not directly make the change
   */
  public async requestDeleteDataSource(policyId: string, datasourceUUID: string) {
    const oldPolicy = await this.adapter.get(policyId);

    if (oldPolicy.status !== 'active') {
      throw new Error(
        `Policy ${oldPolicy.id} can not be updated becuase it is ${oldPolicy.status}`
      );
    }

    if (!oldPolicy.data_sources.find(ds => ds.uuid === datasourceUUID)) {
      throw new Error(
        `Policy ${oldPolicy.id} does not contain a datasource with a uuid of ${datasourceUUID}`
      );
    }

    const newPolicyInfo = await this._update(oldPolicy, {
      data_sources: oldPolicy.data_sources.filter(ds => ds.uuid !== datasourceUUID),
    });
    return {
      id: newPolicyInfo.id,
      version: newPolicyInfo.version,
      shared_id: newPolicyInfo.shared_id,
    };
  }

  private async _update(oldPolicy: PolicyFile, policy: Partial<PolicyFile>) {
    const policyData = {
      // @ts-ignore because types seem fine, but failing saying only 1 arg, however it works perfectly
      ...assign<PolicyFile>({}, omit(oldPolicy, ['id']), policy),
      version: oldPolicy.version + 1,
    };

    const newPolicy = await this.adapter.create(policyData);

    await this.adapter.update(oldPolicy.id, {
      ...omit(oldPolicy, ['id']),
      status: 'locked',
      updated_on: new Date().toString(),
    });
    // TODO fire events for fleet that update was made

    return newPolicy;
  }
}
