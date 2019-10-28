/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { FrameworkRequest } from '../../adapters/framework/adapter_types';
import { FleetServerLib } from '../../libs/types';
import { DEFAULT_AGENTS_PAGE_SIZE } from '../../../common/constants';
import { ReturnTypeList, ReturnTypeCreate } from '../../../common/return_types';
import { EnrollmentApiKey } from '../../../common/types/domain_data';

export const createGETEnrollmentApiKeysRoute = (libs: FleetServerLib) => ({
  method: 'GET',
  path: '/api/fleet/enrollment-api-keys',
  options: {
    tags: ['access:fleet-read'],
    validate: {
      query: {
        page: Joi.number().default(1),
        perPage: Joi.number().default(DEFAULT_AGENTS_PAGE_SIZE),
        showInactive: Joi.boolean().default(false),
        kuery: Joi.string()
          .trim()
          .optional(),
      },
    },
  },
  handler: async (
    request: FrameworkRequest<{
      query: { page: string; perPage: string; kuery: string; showInactive: string };
    }>
  ): Promise<ReturnTypeList<EnrollmentApiKey>> => {
    const { items, total, page, perPage } = await libs.apiKeys.listEnrollmentApiKeys(request.user, {
      page: parseInt(request.query.page, 10),
      perPage: parseInt(request.query.perPage, 10),
      kuery: request.query.kuery,
      showInactive: Boolean(request.query.showInactive),
    });

    return { list: items, success: true, total, page, perPage };
  },
});

export const createPOSTEnrollmentApiKeysRoute = (libs: FleetServerLib) => ({
  method: 'POST',
  path: '/api/fleet/enrollment-api-keys',
  options: {
    tags: ['access:fleet-write'],
    validate: {
      payload: Joi.object({
        name: Joi.string().optional(),
        policy_id: Joi.string().optional(),
        expiration: Joi.string().optional(),
      }),
    },
  },
  handler: async (
    request: FrameworkRequest<{
      payload: { policy_id?: string; expiration?: string; name?: string };
    }>
  ): Promise<ReturnTypeCreate<EnrollmentApiKey>> => {
    const data = {
      name: request.payload.name,
      expiration: request.payload.expiration,
      policyId: request.payload.policy_id,
    };
    const apiKey = await libs.apiKeys.generateEnrollmentApiKey(request.user, data);

    return { item: apiKey, success: true, action: 'created' };
  },
});
