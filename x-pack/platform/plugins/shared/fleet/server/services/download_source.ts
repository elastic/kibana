/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { SavedObject } from '@kbn/core/server';

import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';

import {
  DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
  DEFAULT_DOWNLOAD_SOURCE_URI,
  DEFAULT_DOWNLOAD_SOURCE_ID,
} from '../constants';

import type {
  DownloadSource,
  DownloadSourceSOAttributes,
  DownloadSourceBase,
  SecretReference,
} from '../types';
import {
  DownloadSourceError,
  FleetEncryptedSavedObjectEncryptionKeyRequired,
  FleetError,
} from '../errors';
import { SO_SEARCH_LIMIT } from '../../common';

import { deleteDownloadSourceSecrets, deleteSecrets, isSecretStorageEnabled } from './secrets';

import { agentPolicyService } from './agent_policy';
import { appContextService } from './app_context';
import { escapeSearchQueryPhrase } from './saved_object';
import { getFleetProxy } from './fleet_proxies';
import {
  extractAndWriteDownloadSourcesSecrets,
  extractAndUpdateDownloadSourceSecrets,
} from './secrets';
import { isSSLSecretStorageEnabled } from './secrets';

function savedObjectToDownloadSource(so: SavedObject<DownloadSourceSOAttributes>) {
  const { ssl, source_id: sourceId, ...attributes } = so.attributes;

  return {
    id: sourceId ?? so.id,
    ...attributes,
    ...(ssl ? { ssl: JSON.parse(ssl as string) } : {}),
  };
}

class DownloadSourceService {
  private get soClient() {
    return appContextService.getInternalUserSOClient();
  }

  private get encryptedSoClient() {
    return appContextService.getEncryptedSavedObjects();
  }

  public async get(id: string): Promise<DownloadSource> {
    const soResponse =
      await this.encryptedSoClient.getDecryptedAsInternalUser<DownloadSourceSOAttributes>(
        DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
        id
      );

    if (soResponse.error) {
      throw new FleetError(soResponse.error.message);
    }

    return savedObjectToDownloadSource(soResponse);
  }

  public async list() {
    const downloadSourcesFinder =
      await this.encryptedSoClient.createPointInTimeFinderDecryptedAsInternalUser<DownloadSourceSOAttributes>(
        {
          type: DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
          perPage: SO_SEARCH_LIMIT,
          sortField: 'is_default',
          sortOrder: 'desc',
        }
      );

    let downloadSources: SavedObject<DownloadSourceSOAttributes>[] = [];
    let total = 0;
    let page = 0;
    let perPage = 0;

    for await (const result of downloadSourcesFinder.find()) {
      downloadSources = result.saved_objects;
      total = result.total;
      page = result.page;
      perPage = result.per_page;
      break; // Return first page;
    }

    await downloadSourcesFinder.close();

    return {
      items: downloadSources.map<DownloadSource>(savedObjectToDownloadSource),
      total,
      page,
      perPage,
    };
  }

  public async create(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    downloadSource: DownloadSourceBase,
    options?: { id?: string; overwrite?: boolean }
  ): Promise<DownloadSource> {
    const logger = appContextService.getLogger();
    logger.debug(`Creating new download source`);

    const data: DownloadSourceSOAttributes = { ...omit(downloadSource, ['ssl', 'secrets']) };

    if (!appContextService.getEncryptedSavedObjectsSetup()?.canEncrypt) {
      throw new FleetEncryptedSavedObjectEncryptionKeyRequired(
        `Agent binary source needs encrypted saved object api key to be set`
      );
    }

    await this.requireUniqueName({
      name: downloadSource.name,
      id: options?.id,
    });

    if (data.proxy_id) {
      await this.throwIfProxyNotFound(soClient, data.proxy_id);
    }

    // default should be only one
    if (data.is_default) {
      const defaultDownloadSourceId = await this.getDefaultDownloadSourceId();

      if (defaultDownloadSourceId) {
        await this.update(soClient, esClient, defaultDownloadSourceId, { is_default: false });
      }
    }
    if (options?.id) {
      data.source_id = options?.id;
    }
    if (downloadSource.ssl) {
      data.ssl = JSON.stringify(downloadSource.ssl);
    }
    // Store secret values if enabled; if not, store plain text values
    if (await isSSLSecretStorageEnabled(esClient, soClient)) {
      const { downloadSource: downloadSourceWithSecrets } =
        await extractAndWriteDownloadSourcesSecrets({
          downloadSource,
          esClient,
        });

      if (downloadSourceWithSecrets.secrets)
        data.secrets = downloadSourceWithSecrets.secrets as DownloadSourceSOAttributes['secrets'];
    } else {
      if (!downloadSource.ssl?.key && downloadSource.secrets?.ssl?.key) {
        data.ssl = JSON.stringify({ ...downloadSource.ssl, ...downloadSource.secrets.ssl });
      }
    }

    const newSo = await this.soClient.create<DownloadSourceSOAttributes>(
      DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
      data,
      {
        id: options?.id,
        overwrite: options?.overwrite ?? false,
      }
    );
    logger.debug(`Creating new download source ${options?.id}`);
    // soClient.create doesn't return the decrypted attributes, so we need to fetch it again.
    const retrievedSo =
      await this.encryptedSoClient.getDecryptedAsInternalUser<DownloadSourceSOAttributes>(
        DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
        newSo.id
      );
    return savedObjectToDownloadSource(retrievedSo);
  }

  public async update(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    newData: Partial<DownloadSource>
  ) {
    let secretsToDelete: SecretReference[] = [];

    const logger = appContextService.getLogger();
    logger.debug(`Updating download source ${id}`);

    const originalItem = await this.get(id);
    const updateData: Partial<DownloadSourceSOAttributes> = {
      ...omit(newData, ['ssl', 'secrets']),
    };

    if (updateData.proxy_id) {
      await this.throwIfProxyNotFound(soClient, updateData.proxy_id);
    }

    if (updateData.name) {
      await this.requireUniqueName({
        name: updateData.name,
        id,
      });
    }
    if (newData.ssl) {
      updateData.ssl = JSON.stringify(newData.ssl);
    } else if (newData.ssl === null) {
      // Explicitly set to null to allow to delete the field
      updateData.ssl = null;
    }

    if (updateData.is_default) {
      const defaultDownloadSourceId = await this.getDefaultDownloadSourceId();

      if (defaultDownloadSourceId && defaultDownloadSourceId !== id) {
        await this.update(soClient, esClient, defaultDownloadSourceId, { is_default: false });
      }
    }
    // Store secret values if enabled; if not, store plain text values
    if (await isSecretStorageEnabled(esClient, soClient)) {
      const secretsRes = await extractAndUpdateDownloadSourceSecrets({
        oldDownloadSource: originalItem,
        downloadSourceUpdate: newData,
        esClient,
      });

      updateData.secrets = secretsRes.downloadSourceUpdate
        .secrets as DownloadSourceSOAttributes['secrets'];
      secretsToDelete = secretsRes.secretsToDelete;
    } else {
      if (!newData.ssl?.key && newData.secrets?.ssl?.key) {
        updateData.ssl = JSON.stringify({ ...newData.ssl, ...newData.secrets.ssl });
      }
    }

    if (secretsToDelete.length) {
      try {
        await deleteSecrets({ esClient, ids: secretsToDelete.map((s) => s.id) });
      } catch (err) {
        logger.warn(`Error cleaning up secrets for output ${id}: ${err.message}`);
      }
    }

    const soResponse = await this.soClient.update<DownloadSourceSOAttributes>(
      DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
      id,
      updateData
    );
    if (soResponse.error) {
      throw new FleetError(soResponse.error.message);
    } else {
      logger.debug(`Updated download source ${id}`);
    }
  }

  public async delete(id: string) {
    const logger = appContextService.getLogger();
    logger.debug(`Deleting download source ${id}`);

    const targetDS = await this.get(id);

    if (targetDS.is_default) {
      throw new DownloadSourceError(`Default Download source ${id} cannot be deleted.`);
    }
    await agentPolicyService.removeDefaultSourceFromAll(
      appContextService.getInternalUserESClient(),
      id
    );
    await deleteDownloadSourceSecrets({
      esClient: appContextService.getInternalUserESClient(),
      downloadSource: targetDS,
    });

    logger.debug(`Deleting download source ${id}`);
    return this.soClient.delete(DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE, id);
  }

  public async getDefaultDownloadSourceId() {
    const results = await this._getDefaultDownloadSourceSO();

    if (!results.saved_objects.length) {
      return null;
    }

    return savedObjectToDownloadSource(results.saved_objects[0]).id;
  }

  public async ensureDefault(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient) {
    const downloadSources = await this.list();

    const defaultDS = downloadSources.items.find((o) => o.is_default);

    if (!defaultDS) {
      const newDefaultDS: DownloadSourceBase = {
        name: 'Elastic Artifacts',
        is_default: true,
        host: DEFAULT_DOWNLOAD_SOURCE_URI,
      };

      return await this.create(soClient, esClient, newDefaultDS, {
        id: DEFAULT_DOWNLOAD_SOURCE_ID,
        overwrite: true,
      });
    }

    return defaultDS;
  }

  public async requireUniqueName(downloadSource: { name: string; id?: string }) {
    const results = await this.soClient.find<DownloadSourceSOAttributes>({
      type: DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
      searchFields: ['name'],
      search: escapeSearchQueryPhrase(downloadSource.name),
    });
    const idsWithName = results.total && results.saved_objects.map(({ id }) => id);

    if (Array.isArray(idsWithName)) {
      const isEditingSelf = downloadSource?.id && idsWithName.includes(downloadSource.id);
      if (!downloadSource.id || !isEditingSelf) {
        const isSingle = idsWithName.length === 1;

        const existClause = isSingle
          ? `Download Source '${idsWithName[0]}' already exists`
          : `Download Sources '${idsWithName.join(',')}' already exist`;

        throw new FleetError(`${existClause} with name '${downloadSource.name}'`);
      }
    }
  }

  public async listAllForProxyId(proxyId: string) {
    const downloadSources = await this.soClient.find<DownloadSourceSOAttributes>({
      type: DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
      searchFields: ['proxy_id'],
      search: proxyId,
      perPage: SO_SEARCH_LIMIT,
    });

    return {
      items: downloadSources.saved_objects.map<DownloadSource>(savedObjectToDownloadSource),
      total: downloadSources.total,
    };
  }

  private async throwIfProxyNotFound(soClient: SavedObjectsClientContract, id: string) {
    try {
      await getFleetProxy(soClient, id);
    } catch (err) {
      if (err instanceof SavedObjectNotFound) {
        throw new DownloadSourceError(`Proxy ${id} not found`);
      }
      throw new DownloadSourceError(`Error checking proxy_id: ${err.message}`);
    }
  }

  private async _getDefaultDownloadSourceSO() {
    return await this.soClient.find<DownloadSourceSOAttributes>({
      type: DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
      searchFields: ['is_default'],
      search: 'true',
    });
  }
}

export const downloadSourceService = new DownloadSourceService();
