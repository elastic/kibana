/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type {
  SecurityHasPrivilegesPrivileges,
  SecurityIndexPrivilege,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

import { FAILURE_STORE_PRIVILEGE, MANAGE_FAILURE_STORE_PRIVILEGE } from '../../common/constants';

const FAILURE_STORE_PRIVILEGES = [FAILURE_STORE_PRIVILEGE, MANAGE_FAILURE_STORE_PRIVILEGE] as const;

class DatasetQualityPrivileges {
  public async getHasIndexPrivileges(
    esClient: ElasticsearchClient,
    indexes: string[],
    privileges: SecurityIndexPrivilege[],
    isSecurityEnabled: boolean
  ): Promise<Awaited<Record<string, SecurityHasPrivilegesPrivileges>>> {
    if (!isSecurityEnabled) {
      return Object.fromEntries(
        indexes.map((index) => [
          index,
          Object.fromEntries(
            privileges.map((p) => [p, true])
          ) as unknown as SecurityHasPrivilegesPrivileges,
        ])
      );
    }

    try {
      const indexPrivileges = await esClient.security.hasPrivileges({
        index: indexes.map((dataStream) => ({ names: dataStream, privileges })),
      });

      return indexPrivileges.index;
    } catch (error) {
      if (
        error instanceof errors.ResponseError &&
        isUnknownPrivilegeError(error, FAILURE_STORE_PRIVILEGES)
      ) {
        return this.getHasIndexPrivilegesWithoutFailureStore(esClient, indexes, privileges);
      }
      throw error;
    }
  }

  private async getHasIndexPrivilegesWithoutFailureStore(
    esClient: ElasticsearchClient,
    indexes: string[],
    privileges: SecurityIndexPrivilege[]
  ): Promise<Record<string, SecurityHasPrivilegesPrivileges>> {
    const filteredPrivileges = privileges.filter(
      (p) => !FAILURE_STORE_PRIVILEGES.includes(p as (typeof FAILURE_STORE_PRIVILEGES)[number])
    );

    const result: Record<string, SecurityHasPrivilegesPrivileges> =
      filteredPrivileges.length > 0
        ? (
            await esClient.security.hasPrivileges({
              index: indexes.map((dataStream) => ({
                names: dataStream,
                privileges: filteredPrivileges,
              })),
            })
          ).index
        : Object.fromEntries(indexes.map((i) => [i, {} as SecurityHasPrivilegesPrivileges]));

    for (const index of indexes) {
      for (const fsPriv of FAILURE_STORE_PRIVILEGES) {
        if (privileges.includes(fsPriv as SecurityIndexPrivilege)) {
          (result[index] as Record<string, boolean>)[fsPriv] = false;
        }
      }
    }

    return result;
  }

  public async getCanViewIntegrations(
    esClient: ElasticsearchClient,
    isSecurityEnabled: boolean,
    space = '*'
  ): Promise<boolean> {
    if (!isSecurityEnabled) {
      return true;
    }

    const applicationPrivileges = await esClient.security.hasPrivileges({
      application: [
        {
          application: 'kibana-.kibana',
          privileges: ['feature_fleet.read'],
          resources: [space],
        },
      ],
    });

    return (
      applicationPrivileges.application?.['kibana-.kibana']?.[space]?.['feature_fleet.read'] ??
      false
    );
  }

  public async getDatasetPrivileges(
    esClient: ElasticsearchClient,
    dataset: string[],
    isSecurityEnabled: boolean,
    space = '*'
  ): Promise<{
    datasetsPrivilages: Record<
      string,
      {
        canRead: boolean;
        canMonitor: boolean;
        canReadFailureStore: boolean;
        canManageFailureStore: boolean;
      }
    >;
    canViewIntegrations: boolean;
  }> {
    const indexPrivileges = await this.getHasIndexPrivileges(
      esClient,
      dataset,
      ['read', 'monitor', FAILURE_STORE_PRIVILEGE, MANAGE_FAILURE_STORE_PRIVILEGE],
      isSecurityEnabled
    );

    const datasetsPrivilages = Object.fromEntries(
      Object.entries(indexPrivileges).map(([index, privileges]) => [
        index,
        {
          canRead: privileges.read,
          canMonitor: privileges.monitor,
          canReadFailureStore: privileges[FAILURE_STORE_PRIVILEGE],
          canManageFailureStore: privileges[MANAGE_FAILURE_STORE_PRIVILEGE],
        },
      ])
    );

    const canViewIntegrations = await this.getCanViewIntegrations(
      esClient,
      isSecurityEnabled,
      space
    );

    return { datasetsPrivilages, canViewIntegrations };
  }
}

export const datasetQualityPrivileges = new DatasetQualityPrivileges();

function isUnknownPrivilegeError(
  error: errors.ResponseError,
  privilegeNames: ReadonlyArray<string>
): boolean {
  const reason = (error.body as { error?: { reason?: string } } | undefined)?.error?.reason;
  return Boolean(
    reason && privilegeNames.some((name) => reason.includes(`unknown index privilege [${name}]`))
  );
}
