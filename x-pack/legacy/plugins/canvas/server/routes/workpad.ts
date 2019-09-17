/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { omit } from 'lodash';
import { SavedObjectsClientContract, SavedObjectAttributes } from 'src/core/server';
import {
  CANVAS_TYPE,
  API_ROUTE_WORKPAD,
  API_ROUTE_WORKPAD_ASSETS,
  API_ROUTE_WORKPAD_STRUCTURES,
} from '../../common/lib/constants';
import { getId } from '../../public/lib/get_id';
import { CoreSetup } from '../shim';
// @ts-ignore Untyped Local
import { formatResponse as formatRes } from '../lib/format_response';
import { CanvasWorkpad } from '../../types';

type WorkpadAttributes = Pick<CanvasWorkpad, Exclude<keyof CanvasWorkpad, 'id'>> & {
  '@timestamp': string;
  '@created': string;
};

interface WorkpadRequestFacade {
  getSavedObjectsClient: () => SavedObjectsClientContract;
}

type WorkpadRequest = WorkpadRequestFacade & {
  params: {
    id: string;
  };
  payload: CanvasWorkpad;
};

type FindWorkpadRequest = WorkpadRequestFacade & {
  query: {
    name: string;
    page: number;
    perPage: number;
  };
};

type AssetsRequest = WorkpadRequestFacade & {
  params: {
    id: string;
  };
  payload: CanvasWorkpad['assets'];
};

export function workpad(
  route: CoreSetup['http']['route'],
  elasticsearch: CoreSetup['elasticsearch']
) {
  // @ts-ignore EsErrors is not on the Cluster type
  const { errors: esErrors } = elasticsearch.getCluster('data');
  const routePrefix = API_ROUTE_WORKPAD;
  const routePrefixAssets = API_ROUTE_WORKPAD_ASSETS;
  const routePrefixStructures = API_ROUTE_WORKPAD_STRUCTURES;
  const formatResponse = formatRes(esErrors);

  function createWorkpad(req: WorkpadRequest) {
    const savedObjectsClient = req.getSavedObjectsClient();

    if (!req.payload) {
      return Promise.reject(boom.badRequest('A workpad payload is required'));
    }

    const now = new Date().toISOString();
    const { id, ...payload } = req.payload;
    return savedObjectsClient.create<WorkpadAttributes>(
      CANVAS_TYPE,
      {
        ...payload,
        '@timestamp': now,
        '@created': now,
      },
      { id: id || getId('workpad') }
    );
  }

  function updateWorkpad(
    req: WorkpadRequest | AssetsRequest,
    newPayload?: CanvasWorkpad | { assets: CanvasWorkpad['assets'] }
  ) {
    const savedObjectsClient = req.getSavedObjectsClient();
    const { id } = req.params;
    const payload = newPayload ? newPayload : req.payload;

    const now = new Date().toISOString();

    return savedObjectsClient.get<WorkpadAttributes>(CANVAS_TYPE, id).then(workpadObject => {
      // TODO: Using create with force over-write because of version conflict issues with update
      return savedObjectsClient.create(
        CANVAS_TYPE,
        {
          ...(workpadObject.attributes as SavedObjectAttributes),
          ...omit(payload, 'id'), // never write the id property
          '@timestamp': now, // always update the modified time
          '@created': workpadObject.attributes['@created'], // ensure created is not modified
        },
        { overwrite: true, id }
      );
    });
  }

  function deleteWorkpad(req: WorkpadRequest) {
    const savedObjectsClient = req.getSavedObjectsClient();
    const { id } = req.params;

    return savedObjectsClient.delete(CANVAS_TYPE, id);
  }

  function findWorkpad(req: FindWorkpadRequest) {
    const savedObjectsClient = req.getSavedObjectsClient();
    const { name, page, perPage } = req.query;

    return savedObjectsClient.find({
      type: CANVAS_TYPE,
      sortField: '@timestamp',
      sortOrder: 'desc',
      search: name ? `${name}* | ${name}` : '*',
      searchFields: ['name'],
      fields: ['id', 'name', '@created', '@timestamp'],
      page,
      perPage,
    });
  }

  // get workpad
  route({
    method: 'GET',
    path: `${routePrefix}/{id}`,
    handler(req: WorkpadRequest) {
      const savedObjectsClient = req.getSavedObjectsClient();
      const { id } = req.params;

      return savedObjectsClient
        .get<WorkpadAttributes>(CANVAS_TYPE, id)
        .then(obj => {
          if (
            // not sure if we need to be this defensive
            obj.type === 'canvas-workpad' &&
            obj.attributes &&
            obj.attributes.pages &&
            obj.attributes.pages.length
          ) {
            obj.attributes.pages.forEach(page => {
              const elements = (page.elements || []).filter(
                ({ id: pageId }) => !pageId.startsWith('group')
              );
              const groups = (page.groups || []).concat(
                (page.elements || []).filter(({ id: pageId }) => pageId.startsWith('group'))
              );
              page.elements = elements;
              page.groups = groups;
            });
          }
          return obj;
        })
        .then(obj => ({ id: obj.id, ...obj.attributes }))
        .then(formatResponse)
        .catch(formatResponse);
    },
  });

  // create workpad
  route({
    method: 'POST',
    path: routePrefix,
    // @ts-ignore config option missing on route method type
    config: { payload: { allow: 'application/json', maxBytes: 26214400 } }, // 25MB payload limit
    handler(request: WorkpadRequest) {
      return createWorkpad(request)
        .then(() => ({ ok: true }))
        .catch(formatResponse);
    },
  });

  // update workpad
  route({
    method: 'PUT',
    path: `${routePrefix}/{id}`,
    // @ts-ignore config option missing on route method type
    config: { payload: { allow: 'application/json', maxBytes: 26214400 } }, // 25MB payload limit
    handler(request: WorkpadRequest) {
      return updateWorkpad(request)
        .then(() => ({ ok: true }))
        .catch(formatResponse);
    },
  });

  // update workpad assets
  route({
    method: 'PUT',
    path: `${routePrefixAssets}/{id}`,
    // @ts-ignore config option missing on route method type
    config: { payload: { allow: 'application/json', maxBytes: 26214400 } }, // 25MB payload limit
    handler(request: AssetsRequest) {
      const payload = { assets: request.payload };
      return updateWorkpad(request, payload)
        .then(() => ({ ok: true }))
        .catch(formatResponse);
    },
  });

  // update workpad structures
  route({
    method: 'PUT',
    path: `${routePrefixStructures}/{id}`,
    // @ts-ignore config option missing on route method type
    config: { payload: { allow: 'application/json', maxBytes: 26214400 } }, // 25MB payload limit
    handler(request: WorkpadRequest) {
      return updateWorkpad(request)
        .then(() => ({ ok: true }))
        .catch(formatResponse);
    },
  });

  // delete workpad
  route({
    method: 'DELETE',
    path: `${routePrefix}/{id}`,
    handler(request: WorkpadRequest) {
      return deleteWorkpad(request)
        .then(() => ({ ok: true }))
        .catch(formatResponse);
    },
  });

  // find workpads
  route({
    method: 'GET',
    path: `${routePrefix}/find`,
    handler(request: FindWorkpadRequest) {
      return findWorkpad(request)
        .then(formatResponse)
        .then(resp => {
          return {
            total: resp.total,
            workpads: resp.saved_objects.map(hit => ({ id: hit.id, ...hit.attributes })),
          };
        })
        .catch(() => {
          return {
            total: 0,
            workpads: [],
          };
        });
    },
  });
}
