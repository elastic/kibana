/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import type { SavedServiceGroup } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { MAX_DESCRIPTION_LENGTH, MAX_FIELD_VALUE_LENGTH, MAX_KUERY_LENGTH } from '../../constants';

export type SaveServiceGroupResponse = SavedServiceGroup;

export const serviceGroupSaveRoute = defineRoute<SaveServiceGroupResponse>()({
  endpoint: 'POST /internal/apm/service-group',
  params: lazySchema(() =>
    z.object({
      query: z
        .object({ serviceGroupId: z.string().max(MAX_FIELD_VALUE_LENGTH).optional() })
        .optional(),
      body: z.object({
        groupName: z.string().max(MAX_FIELD_VALUE_LENGTH),
        kuery: z.string().max(MAX_KUERY_LENGTH),
        description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
        color: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
      }),
    })
  ),
});
