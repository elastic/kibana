/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden } from '@hapi/boom';
import type {
  SecurityHasPrivilegesPrivileges,
  SecurityIndexPrivilege,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

import { streamPartsToIndexPattern } from '../../common/utils';
import { DEFAULT_DATASET_TYPE, FAILURE_STORE_PRIVILEGE } from '../../common/constants';

class DatasetQualityPrivileges {
  public async getHasIndexPrivileges(
    esClient: ElasticsearchClient,
    indexes: string[],
    privileges: SecurityIndexPrivilege[]
  ): Promise<Awaited<Record<string, SecurityHasPrivilegesPrivileges>>> {
    const indexPrivileges = await esClient.security.hasPrivileges({
      index: indexes.map((dataStream) => ({ names: dataStream, privileges })),
    });

    return indexPrivileges.index;
  }

  public async getCanViewIntegrations(
    esClient: ElasticsearchClient,
    space = '*'
  ): Promise<boolean> {
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
    dataset: string,
    space = '*'
  ): Promise<{
    canRead: boolean;
    canMonitor: boolean;
    canViewIntegrations: boolean;
    canReadFailureStore: boolean;
  }> {
    const indexPrivileges = await esClient.security.hasPrivileges({
      index: [
        {
          names: dataset,
          privileges: ['read', 'monitor', 'view_index_metadata', FAILURE_STORE_PRIVILEGE],
        },
      ],
    });

    const canRead = indexPrivileges.index[dataset]?.read ?? false;
    const canViewIndexMetadata = indexPrivileges.index[dataset]?.view_index_metadata ?? false;
    const canReadFailureStore = indexPrivileges.index[dataset]?.[FAILURE_STORE_PRIVILEGE] ?? false;

    const canViewIntegrations = await this.getCanViewIntegrations(esClient, space);

    return { canRead, canMonitor: canViewIndexMetadata, canViewIntegrations, canReadFailureStore };
  }

  public async canReadDataset(
    esClient: ElasticsearchClient,
    type = DEFAULT_DATASET_TYPE,
    datasetQuery = '*-*',
    space = '*'
  ): Promise<boolean> {
    const datasetName = streamPartsToIndexPattern({
      typePattern: type,
      datasetPattern: datasetQuery,
    });

    const datasetUserPrivileges = await datasetQualityPrivileges.getDatasetPrivileges(
      esClient,
      datasetName,
      space
    );

    return datasetUserPrivileges.canRead;
  }

  public async throwIfCannotReadDataset(
    esClient: ElasticsearchClient,
    type = DEFAULT_DATASET_TYPE,
    datasetQuery = '*-*',
    space = '*'
  ): Promise<void> {
    if (!(await this.canReadDataset(esClient, type, datasetQuery, space))) {
      const datasetName = streamPartsToIndexPattern({
        typePattern: type,
        datasetPattern: datasetQuery,
      });

      throw forbidden(`Unauthorized to read dataset ${datasetName}`);
    }
  }
}

export const datasetQualityPrivileges = new DatasetQualityPrivileges();
