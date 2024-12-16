/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sortBy from 'lodash/sortBy';
import { deserializeGeoipDatabase, type GeoipDatabaseFromES } from './serialization';
import { API_BASE_PATH } from '../../../../common/constants';
import { RouteDependencies } from '../../../types';

export const registerListDatabaseRoute = ({
  router,
  lib: { handleEsError },
}: RouteDependencies): void => {
  router.get({ path: `${API_BASE_PATH}/databases`, validate: false }, async (ctx, req, res) => {
    const { client: clusterClient } = (await ctx.core).elasticsearch;

    try {
      const data = (await clusterClient.asCurrentUser.ingest.getGeoipDatabase()) as {
        databases: GeoipDatabaseFromES[];
      };

      const body = sortBy(data.databases.map(deserializeGeoipDatabase), 'name');

      return res.ok({ body });
    } catch (error) {
      const esErrorResponse = handleEsError({ error, response: res });
      if (esErrorResponse.status === 404) {
        // ES returns 404 when there are no pipelines
        // Instead, we return an empty array and 200 status back to the client
        return res.ok({ body: [] });
      }
      return esErrorResponse;
    }
  });
};
