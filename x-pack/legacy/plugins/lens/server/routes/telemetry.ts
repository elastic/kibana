/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { KibanaConfig, Server } from 'src/legacy/server/kbn_server';
import { CoreSetup, SavedObjectsLegacyService } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { BASE_API_URL } from '../../common';

export function getSavedObjectsClient(
  savedObjects: SavedObjectsLegacyService,
  callAsInternalUser: unknown
) {
  const { SavedObjectsClient, getSavedObjectsRepository } = savedObjects;
  const internalRepository = getSavedObjectsRepository(callAsInternalUser);
  return new SavedObjectsClient(internalRepository);
}

// This route is responsible for taking a batch of click events from the browser
// and writing them to saved objects
export async function initLensUsageRoute(
  setup: CoreSetup,
  plugins: {
    savedObjects: SavedObjectsLegacyService;
    config: KibanaConfig;
    // server: Server;
  }
) {
  const router = setup.http.createRouter();
  router.post(
    {
      path: `${BASE_API_URL}/telemetry`,
      validate: {
        params: schema.object({}),
        body: schema.object({
          clicks: schema.arrayOf(
            schema.object({
              name: schema.string(),
              date: schema.string(),
            })
          ),
          suggestionClicks: schema.arrayOf(
            schema.object({
              name: schema.string(),
              date: schema.string(),
            })
          ),
        }),
      },
    },
    async (context, req, res) => {
      const { dataClient } = context.core.elasticsearch;

      const { clicks, suggestionClicks } = req.body;

      try {
        const client = getSavedObjectsClient(plugins.savedObjects, dataClient.callAsCurrentUser);

        const clickEvents = clicks.map(event => ({
          type: 'lens-ui-telemetry',
          attributes: {
            name: event.name,
            type: 'click',
            date: event.date,
          },
        }));
        const suggestionEvents = suggestionClicks.map(event => ({
          type: 'lens-ui-telemetry',
          attributes: {
            name: event.name,
            type: 'suggestion',
            date: event.date,
          },
        }));

        await client.bulkCreate(clickEvents.concat(suggestionEvents));

        return res.ok({ body: {} });
      } catch (e) {
        if (e.status === 404) {
          return res.notFound();
        }
        if (e.isBoom) {
          if (e.output.statusCode === 404) {
            return res.notFound();
          }
          return res.internalError(e.output.message);
        } else {
          return res.internalError({
            body: Boom.internal(e.message || e.name),
          });
        }
      }
    }
  );
}
