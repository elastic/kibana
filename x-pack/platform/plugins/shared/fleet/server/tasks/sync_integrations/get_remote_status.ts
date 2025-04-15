/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import fetch from 'node-fetch';
import type { RequestInit } from 'node-fetch';

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { API_VERSIONS } from '../../../common';

import { appContextService } from '../../services';
import { outputService } from '../../services';

import { FleetError, FleetNotFoundError } from '../../errors';

import type { GetRemoteSyncedIntegrationsStatusResponse } from '../../../common/types';

export const getRemoteSyncedIntegrationsInfoByOutputId = async (
  soClient: SavedObjectsClientContract,
  outputId: string
): Promise<GetRemoteSyncedIntegrationsStatusResponse> => {
  const { enableSyncIntegrationsOnRemote } = appContextService.getExperimentalFeatures();
  const logger = appContextService.getLogger();

  if (!enableSyncIntegrationsOnRemote) {
    return { integrations: [] };
  }
  try {
    const output = await outputService.get(soClient, outputId);
    if (!output) {
      throw new FleetNotFoundError(`No output found with id ${outputId}`);
    }
    if (output?.type !== 'remote_elasticsearch') {
      throw new FleetError(`Output ${outputId} is not a remote elasticsearch output`);
    }

    const {
      kibana_api_key: kibanaApiKey,
      kibana_url: kibanaUrl,
      sync_integrations: syncIntegrations,
    } = output;

    if (!syncIntegrations) {
      throw new FleetError(`Synced integrations not enabled`);
    }
    if (!kibanaUrl || kibanaUrl === '') {
      throw new FleetNotFoundError(`Remote Kibana URL not set on the output.`);
    }
    if (!kibanaApiKey) {
      throw new FleetNotFoundError(`Remote Kibana API key for ${kibanaUrl} not found`);
    }
    const options: RequestInit = {
      headers: {
        'kbn-xsrf': 'true',
        'User-Agent': `Kibana/${appContextService.getKibanaVersion()} node-fetch`,
        'Content-Type': 'application/json',
        'Elastic-Api-Version': API_VERSIONS.public.v1,
        Authorization: `ApiKey ${kibanaApiKey}`,
      },
      method: 'GET',
    };
    const url = `${kibanaUrl}/api/fleet/remote_synced_integrations/status`;
    logger.info(`Fetching ${kibanaUrl}/api/fleet/remote_synced_integrations/status`);

    const res = await fetch(url, options);

    const body = await res.json();

    return body as GetRemoteSyncedIntegrationsStatusResponse;
  } catch (error) {
    logger.error(`${error}`);
    throw error;
  }
};
