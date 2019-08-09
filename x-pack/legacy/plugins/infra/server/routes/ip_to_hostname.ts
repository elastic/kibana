/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { boomify, notFound } from 'boom';
import { first } from 'lodash';
import { InfraBackendLibs } from '../lib/infra_types';
import { InfraWrappableRequest } from '../lib/adapters/framework';

interface IpToHostRequest {
  ip: string;
  index_pattern: string;
}

type IpToHostWrappedRequest = InfraWrappableRequest<IpToHostRequest>;

export interface IpToHostResponse {
  host: string;
}

interface HostDoc {
  _source: {
    host: {
      name: string;
    };
  };
}

const ipToHostSchema = Joi.object({
  ip: Joi.string().required(),
  index_pattern: Joi.string().required(),
});

export const initIpToHostName = ({ framework }: InfraBackendLibs) => {
  const { callWithRequest } = framework;
  framework.registerRoute<IpToHostWrappedRequest, Promise<IpToHostResponse>>({
    method: 'POST',
    path: '/api/infra/ip_to_host',
    options: {
      validate: { payload: ipToHostSchema },
    },
    handler: async req => {
      try {
        const params = {
          index: req.payload.index_pattern,
          body: {
            size: 1,
            query: {
              match: { 'host.ip': req.payload.ip },
            },
            _source: ['host.name'],
          },
        };
        const response = await callWithRequest<HostDoc>(req, 'search', params);
        if (response.hits.total.value === 0) {
          throw notFound('Host with matching IP address not found.');
        }
        const hostDoc = first(response.hits.hits);
        return { host: hostDoc._source.host.name };
      } catch (e) {
        throw boomify(e);
      }
    },
  });
};
