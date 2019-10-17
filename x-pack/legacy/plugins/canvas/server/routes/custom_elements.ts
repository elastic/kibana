/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { omit } from 'lodash';
import { SavedObjectsClientContract } from 'src/core/server';

import { API_ROUTE_CUSTOM_ELEMENT, CUSTOM_ELEMENT_TYPE } from '../../common/lib/constants';
import { getId } from '../../public/lib/get_id';
// @ts-ignore Untyped Local
import { formatResponse as formatRes } from '../lib/format_response';
import { CustomElement } from '../../types';

import { CoreSetup } from '../shim';

// Exclude ID attribute for the type used for SavedObjectClient
type CustomElementAttributes = Pick<CustomElement, Exclude<keyof CustomElement, 'id'>> & {
  '@timestamp': string;
  '@created': string;
};

interface CustomElementRequestFacade {
  getSavedObjectsClient: () => SavedObjectsClientContract;
}

type CustomElementRequest = CustomElementRequestFacade & {
  params: {
    id: string;
  };
  payload: CustomElement;
};

type FindCustomElementRequest = CustomElementRequestFacade & {
  query: {
    name: string;
    page: number;
    perPage: number;
  };
};

export function customElements(
  route: CoreSetup['http']['route'],
  elasticsearch: CoreSetup['elasticsearch']
) {
  // @ts-ignore: errors not on Cluster type
  const { errors: esErrors } = elasticsearch.getCluster('data');

  const routePrefix = API_ROUTE_CUSTOM_ELEMENT;
  const formatResponse = formatRes(esErrors);

  const createCustomElement = (req: CustomElementRequest) => {
    const savedObjectsClient = req.getSavedObjectsClient();

    if (!req.payload) {
      return Promise.reject(boom.badRequest('A custom element payload is required'));
    }

    const now = new Date().toISOString();
    const { id, ...payload } = req.payload;
    return savedObjectsClient.create<CustomElementAttributes>(
      CUSTOM_ELEMENT_TYPE,
      {
        ...payload,
        '@timestamp': now,
        '@created': now,
      },
      { id: id || getId('custom-element') }
    );
  };

  const updateCustomElement = (req: CustomElementRequest, newPayload?: CustomElement) => {
    const savedObjectsClient = req.getSavedObjectsClient();
    const { id } = req.params;
    const payload = newPayload ? newPayload : req.payload;

    const now = new Date().toISOString();

    return savedObjectsClient
      .get<CustomElementAttributes>(CUSTOM_ELEMENT_TYPE, id)
      .then(element => {
        // TODO: Using create with force over-write because of version conflict issues with update
        return savedObjectsClient.create<CustomElementAttributes>(
          CUSTOM_ELEMENT_TYPE,
          {
            ...element.attributes,
            ...omit(payload, 'id'), // never write the id property
            '@timestamp': now, // always update the modified time
            '@created': element.attributes['@created'], // ensure created is not modified
          },
          { overwrite: true, id }
        );
      });
  };

  const deleteCustomElement = (req: CustomElementRequest) => {
    const savedObjectsClient = req.getSavedObjectsClient();
    const { id } = req.params;

    return savedObjectsClient.delete(CUSTOM_ELEMENT_TYPE, id);
  };

  const findCustomElement = (req: FindCustomElementRequest) => {
    const savedObjectsClient = req.getSavedObjectsClient();
    const { name, page, perPage } = req.query;

    return savedObjectsClient.find<CustomElementAttributes>({
      type: CUSTOM_ELEMENT_TYPE,
      sortField: '@timestamp',
      sortOrder: 'desc',
      search: name ? `${name}* | ${name}` : '*',
      searchFields: ['name'],
      fields: ['id', 'name', 'displayName', 'help', 'image', 'content', '@created', '@timestamp'],
      page,
      perPage,
    });
  };

  const getCustomElementById = (req: CustomElementRequest) => {
    const savedObjectsClient = req.getSavedObjectsClient();
    const { id } = req.params;
    return savedObjectsClient.get(CUSTOM_ELEMENT_TYPE, id);
  };

  // get custom element by id
  route({
    method: 'GET',
    path: `${routePrefix}/{id}`,
    handler: (req: CustomElementRequest) =>
      getCustomElementById(req)
        .then(obj => ({ id: obj.id, ...obj.attributes }))
        .then(formatResponse)
        .catch(formatResponse),
  });

  // create custom element
  route({
    method: 'POST',
    path: routePrefix,
    // @ts-ignore config option missing on route method type
    config: { payload: { allow: 'application/json', maxBytes: 26214400 } }, // 25MB payload limit
    handler: (req: CustomElementRequest) =>
      createCustomElement(req)
        .then(() => ({ ok: true }))
        .catch(formatResponse),
  });

  // update custom element
  route({
    method: 'PUT',
    path: `${routePrefix}/{id}`,
    // @ts-ignore config option missing on route method type
    config: { payload: { allow: 'application/json', maxBytes: 26214400 } }, // 25MB payload limit
    handler: (req: CustomElementRequest) =>
      updateCustomElement(req)
        .then(() => ({ ok: true }))
        .catch(formatResponse),
  });

  // delete custom element
  route({
    method: 'DELETE',
    path: `${routePrefix}/{id}`,
    handler: (req: CustomElementRequest) =>
      deleteCustomElement(req)
        .then(() => ({ ok: true }))
        .catch(formatResponse),
  });

  // find custom elements
  route({
    method: 'GET',
    path: `${routePrefix}/find`,
    handler: (req: FindCustomElementRequest) =>
      findCustomElement(req)
        .then(formatResponse)
        .then(resp => {
          return {
            total: resp.total,
            customElements: resp.saved_objects.map(hit => ({ id: hit.id, ...hit.attributes })),
          };
        })
        .catch(() => {
          return {
            total: 0,
            customElements: [],
          };
        }),
  });
}
