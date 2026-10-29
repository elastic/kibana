/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  BOOST_PROTOTYPE_SETTINGS_API_PATH,
  BOOST_RESTORE_API_PATH,
  BOOST_SAMPLE_DATA_API_PATH,
  BOOST_SAMPLE_DATA_SAVED_OBJECT_ID,
  BOOST_SAVED_OBJECT_TYPE,
  MANAGE_BOOST_PRIVILEGE,
  READ_BOOST_PRIVILEGE,
} from '../../common/constants';
import { getState, resetState } from '../lib/boost_store';
import {
  getPrototypeSettings,
  resetPrototypeSettings,
  updatePrototypeSettings,
} from '../prototype/prototype_settings';
import { ensureSampleConfig } from '../prototype/sample_config';
import { ensureSampleData } from '../prototype/sample_data';
import { getRequestClients } from './request_clients';

/**
 * The sample data's version. Raising it updates projects seeded with an earlier one, such as to give
 * their sample data streams a data stream lifecycle (version 2).
 */
const SAMPLE_DATA_VERSION = 2;

/** The version of the sample data the project was seeded with, or `undefined` if it wasn't. */
const getSeededVersion = async (
  client: SavedObjectsClientContract
): Promise<number | undefined> => {
  try {
    const {
      attributes: { version },
    } = await client.get<{ version?: number }>(
      BOOST_SAVED_OBJECT_TYPE,
      BOOST_SAMPLE_DATA_SAVED_OBJECT_ID
    );
    // Projects seeded before the sample data had versions.
    return version ?? 1;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
};

const prototypeSettingsBodySchema = schema.object({
  shows_estimates: schema.maybe(schema.boolean()),
  allows_multiple_targets: schema.maybe(schema.boolean()),
});

const markSampleDataSeeded = async (client: SavedObjectsClientContract): Promise<void> => {
  await client.create(
    BOOST_SAVED_OBJECT_TYPE,
    { kind: 'sample_data', seeded_at: new Date().toISOString(), version: SAMPLE_DATA_VERSION },
    { id: BOOST_SAMPLE_DATA_SAVED_OBJECT_ID, overwrite: true }
  );
};

// Sample indices are created with the signed-in user's privileges: Kibana's own service account
// cannot create indices outside its system indices.
export const registerPrototypeRoutes = (router: IRouter) => {
  // Seeds the project once, the first time someone who can manage boost loads Kibana, and updates
  // the sample data once after each new version of it.
  router.post(
    {
      path: BOOST_SAMPLE_DATA_API_PATH,
      security: { authz: { requiredPrivileges: [MANAGE_BOOST_PRIVILEGE] } },
      validate: false,
    },
    async (context, _request, response) => {
      const { savedObjectsClient, esClient } = await getRequestClients(context);
      const seededVersion = await getSeededVersion(savedObjectsClient);
      if (seededVersion === SAMPLE_DATA_VERSION) {
        return response.ok({ body: { created: [] } });
      }

      const created = await ensureSampleData(esClient);
      // Only a new project gets the sample profiles and rules, so an update keeps the configuration.
      if (seededVersion === undefined) {
        await ensureSampleConfig(savedObjectsClient);
      }
      await markSampleDataSeeded(savedObjectsClient);
      return response.ok({ body: { created } });
    }
  );

  // The prototype menu's switches, which everyone shares, and which change what everyone sees.
  router.get(
    {
      path: BOOST_PROTOTYPE_SETTINGS_API_PATH,
      security: { authz: { requiredPrivileges: [READ_BOOST_PRIVILEGE] } },
      validate: false,
    },
    async (context, _request, response) => {
      const { savedObjectsClient } = await getRequestClients(context);
      return response.ok({ body: await getPrototypeSettings(savedObjectsClient) });
    }
  );

  router.put(
    {
      path: BOOST_PROTOTYPE_SETTINGS_API_PATH,
      security: { authz: { requiredPrivileges: [MANAGE_BOOST_PRIVILEGE] } },
      validate: { body: prototypeSettingsBodySchema },
    },
    async (context, { body }, response) => {
      const { savedObjectsClient } = await getRequestClients(context);
      return response.ok({ body: await updatePrototypeSettings(savedObjectsClient, body) });
    }
  );

  // Resets the boost configuration to the sample profiles and rules, and the prototype menu's
  // switches, and re-creates any missing sample data.
  router.post(
    {
      path: BOOST_RESTORE_API_PATH,
      security: { authz: { requiredPrivileges: [MANAGE_BOOST_PRIVILEGE] } },
      validate: false,
    },
    async (context, _request, response) => {
      const { savedObjectsClient, esClient } = await getRequestClients(context);

      await resetState(savedObjectsClient);
      await resetPrototypeSettings(savedObjectsClient);
      const created = await ensureSampleData(esClient);
      await ensureSampleConfig(savedObjectsClient);
      await markSampleDataSeeded(savedObjectsClient);
      return response.ok({
        body: { state: await getState(savedObjectsClient, esClient), created },
      });
    }
  );
};
