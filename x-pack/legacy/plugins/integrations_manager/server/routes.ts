/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from '@hapi/joi';
import Enjoi from 'enjoi';
import {
  PLUGIN_ID,
  API_INTEGRATIONS_LIST,
  API_INTEGRATIONS_INFO,
  API_SAVED_OBJECTS_DETAIL,
  API_SAVED_OBJECTS_ROOT,
  SAVED_OBJECT_TYPE,
} from '../common/constants';
import { Request, ServerRoute } from '../common/types';
import listSchema from '../schemas/consumed/list.schema.json';
import packageSchema from '../schemas/consumed/package.schema.json';
import { fetchInfo, fetchList, getArchiveInfo } from './registry';
import { getClient } from './saved_objects';

interface PostRequest extends Request {
  payload: {
    body: string;
  };
}

// Manager public API paths (currently essentially a proxy to registry service)
export const routes: ServerRoute[] = [
  {
    method: 'GET',
    path: API_INTEGRATIONS_LIST,
    options: {
      tags: [`access:${PLUGIN_ID}`, 'api'],
      response: {
        // TODO: Figure out why we need .meta and to spread
        schema: Enjoi.schema({
          ...listSchema,
          ...listSchema.definitions.IntegrationListElement,
        }).meta({ className: 'IntegrationListElement' }),
      },
    },
    handler: fetchList,
  },
  {
    method: 'GET',
    path: API_INTEGRATIONS_INFO,
    options: {
      tags: [`access:${PLUGIN_ID}`, 'api'],
      validate: {
        params: {
          pkgkey: Joi.string()
            // TODO: real validation for name-semver
            .regex(/\w+-\d+\.\d+\.\d+$/)
            .required(),
        },
      },
      response: {
        // TODO: Figure out why we need .meta and to spread
        schema: Enjoi.schema({
          ...packageSchema,
          ...packageSchema.definitions.Package,
        }).meta({ className: 'Package' }),
      },
    },
    handler: async (req: Request) => fetchInfo(req.params.pkgkey),
  },
  {
    method: 'GET',
    path: `${API_INTEGRATIONS_INFO}.zip`,
    options: { tags: [`access:${PLUGIN_ID}`] },
    handler: async (req: Request) => {
      const { pkgkey } = req.params;
      const paths = await getArchiveInfo(`${pkgkey}.zip`);
      return { meta: { pkgkey, paths } };
    },
  },
  {
    method: 'GET',
    path: `${API_INTEGRATIONS_INFO}.tar.gz`,
    options: { tags: [`access:${PLUGIN_ID}`] },
    handler: async (req: Request) => {
      const { pkgkey } = req.params;
      const paths = await getArchiveInfo(`${pkgkey}.tar.gz`);
      return { meta: { pkgkey, paths } };
    },
  },
  {
    method: 'GET',
    path: API_SAVED_OBJECTS_ROOT,
    options: { tags: [`access:${PLUGIN_ID}`] },
    handler: async (req: Request) => getClient(req).find({ type: SAVED_OBJECT_TYPE }),
  },
  {
    method: 'GET',
    path: API_SAVED_OBJECTS_DETAIL,
    options: { tags: [`access:${PLUGIN_ID}`] },
    handler: async (req: Request) => getClient(req).get(SAVED_OBJECT_TYPE, req.params.oid),
  },
  {
    method: 'POST',
    path: API_SAVED_OBJECTS_ROOT,
    options: { tags: [`access:${PLUGIN_ID}`] },
    handler: async (req: PostRequest) =>
      getClient(req).create(
        SAVED_OBJECT_TYPE,
        {
          is_working: true,
          other: req.payload.body,
        },
        { id: 'TBD', overwrite: true }
      ),
  },
];
