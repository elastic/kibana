/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { getClusterAccessor } from '../lib/cluster_access';
import { PackageNotInstalledError } from '../packages';
import { PluginContext } from '../plugin';
import { getClient } from '../saved_objects';
import { Request, ResponseToolkit } from '../types';
import { createDatasource } from './create';
import { DatasourcePayload } from '../../common/types';

// TODO: duplicated from packages/handlers.ts. unduplicate.
interface Extra extends ResponseToolkit {
  context: PluginContext;
}

interface CreateDatasourceRequest extends Request {
  params: {
    pkgkey: string;
  };
  payload: DatasourcePayload;
}

export async function handleRequestInstallDatasource(
  request: CreateDatasourceRequest,
  extra: Extra
) {
  const { pkgkey, datasets, datasourceName } = request.payload;
  const user = await request.server.plugins.security?.getUser(request);
  if (!user) return Boom.unauthorized('Must be logged in to perform this operation');

  const savedObjectsClient = getClient(request);
  const callCluster = getClusterAccessor(extra.context.esClient, request);

  try {
    const result = await createDatasource({
      savedObjectsClient,
      pkgkey,
      datasets,
      datasourceName,
      callCluster,
      // long-term, I don't want to pass `request` through
      // but this was the fastest/least invasive change way to make the change
      request,
    });

    return result;
  } catch (error) {
    if (error instanceof PackageNotInstalledError) {
      throw new Boom(error, { statusCode: 403 });
    } else {
      return error;
    }
  }
}
