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
    logger.debug(`Fetching ${kibanaUrl}/api/fleet/remote_synced_integrations/status`);

    let body;
    let errorMessage;
    const res = await fetch(url, options);
    try {
      body = await res.json();
    } catch (error) {
      errorMessage = `GET ${url} failed with status ${res.status}. ${error.message}`;
    }

    if (body?.statusCode && body?.message) {
      errorMessage = `GET ${url} failed with status ${body.statusCode}. ${body.message}`;
    }

    return {
      integrations: body?.integrations ?? [],
      custom_assets: body?.custom_assets,
      error: errorMessage ?? body?.error,
    };
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      throw new FleetNotFoundError(`No output found with id ${outputId}`);
    }
    logger.error(`${error}`);
    throw error;
  }
};
