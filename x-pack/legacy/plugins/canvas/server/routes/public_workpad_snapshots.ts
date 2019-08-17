/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server, Request, RouteOptions } from 'hapi';
import { readFileSync } from 'fs';
import { omit } from 'lodash';
import { SavedObjectAttributes } from 'src/core/server';

import { getId } from '../../public/lib/get_id';

import {
  SNAPSHOT_TYPE,
  API_ROUTE_SNAPSHOT,
  API_ROUTE_SNAPSHOT_RUNTIME,
} from '../../common/lib/constants';

// @ts-ignore
import { RUNTIME_FILE } from '../../external_runtime/constants';
import { CanvasRenderedWorkpad } from '../../external_runtime/types';

const PUBLIC_OPTIONS: RouteOptions = {
  auth: false,
  cors: {
    origin: ['*'],
  },
};

const CREATE_OPTIONS: RouteOptions = {
  payload: {
    allow: 'application/json',
    maxBytes: 26214400, // 25MB payload limit
  },
};

interface IDRequest extends Request {
  params: {
    id: string;
  };
}

interface CreateRequest extends Request {
  payload: CanvasRenderedWorkpad;
}

interface UpdateRequest extends Request {
  params: {
    id: string;
  };
  payload: CanvasRenderedWorkpad;
}

const getSnapshot = async (server: Server, request: IDRequest): Promise<CanvasRenderedWorkpad> => {
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const internalRepository = server.savedObjects.getSavedObjectsRepository(callWithInternalUser);

  try {
    const { id } = request.params;
    const savedObject = await internalRepository.get(SNAPSHOT_TYPE, id);
    const { attributes } = savedObject;
    return attributes;
  } catch (error) {
    if (error.statusCode === 404) {
      throw Boom.notFound('...');
    }
    throw Boom.internal();
  }
};

const createSnapshot = (request: CreateRequest) => {
  const savedObjectsClient = request.getSavedObjectsClient();

  if (!request.payload) {
    return Promise.reject(Boom.badRequest('A snapshot payload is required'));
  }

  const now = new Date().toISOString();
  const { id, ...payload } = request.payload;

  return savedObjectsClient.create(
    SNAPSHOT_TYPE,
    ({
      ...payload,
      '@timestamp': now,
      '@created': now,
    } as any) as SavedObjectAttributes,
    { id: id || getId('snapshot') }
  );
};

const updateSnapshot = async (request: UpdateRequest) => {
  const savedObjectsClient = request.getSavedObjectsClient();
  const { params, payload } = request;
  const { id } = params;

  const now = new Date().toISOString();

  return savedObjectsClient.get(SNAPSHOT_TYPE, id).then(snapshot => {
    // TODO: Using create with force over-write because of version conflict issues with update
    return savedObjectsClient.create(
      SNAPSHOT_TYPE,
      {
        ...snapshot.attributes,
        ...omit(payload, 'id'), // never write the id property
        '@timestamp': now, // always update the modified time
        '@created': snapshot.attributes['@created'], // ensure created is not modified
      },
      { overwrite: true, id }
    );
  });
};

function deleteSnapshot(request: IDRequest) {
  const savedObjectsClient = request.getSavedObjectsClient();
  const { id } = request.params;

  return savedObjectsClient.delete(SNAPSHOT_TYPE, id);
}

export function publicWorkpadSnapshots(server: Server) {
  // create snapshot
  server.route({
    method: 'POST',
    path: `${API_ROUTE_SNAPSHOT}/{id}`,
    async handler(request: CreateRequest) {
      await createSnapshot(request);
      return { ok: true };
    },
    options: CREATE_OPTIONS,
  });

  // update snapshot
  server.route({
    method: 'PUT',
    path: `${API_ROUTE_SNAPSHOT}/{id}`,
    async handler(request: UpdateRequest) {
      await updateSnapshot(request);
      return { ok: true };
    },
    options: CREATE_OPTIONS,
  });

  // delete snapshot
  server.route({
    method: 'DELETE',
    path: `${API_ROUTE_SNAPSHOT}/{id}`,
    async handler(request: IDRequest) {
      await deleteSnapshot(request);
      return { ok: true };
    },
  });

  // get snapshot
  server.route({
    method: 'GET',
    path: `${API_ROUTE_SNAPSHOT}/{id}`,
    async handler(request: IDRequest) {
      return await getSnapshot(server, request);
    },
    options: PUBLIC_OPTIONS,
  });

  // get runtime
  server.route({
    method: 'GET',
    path: API_ROUTE_SNAPSHOT_RUNTIME,
    handler() {
      try {
        return readFileSync(RUNTIME_FILE);
      } catch (error) {
        throw Boom.internal();
      }
    },
    options: PUBLIC_OPTIONS,
  });
}
