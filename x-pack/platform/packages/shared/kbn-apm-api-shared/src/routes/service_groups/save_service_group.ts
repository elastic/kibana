/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { SavedServiceGroup } from '@kbn/apm-types';
import { defineRoute } from '../types';

export type SaveServiceGroupResponse = SavedServiceGroup;

export const serviceGroupSaveRoute = defineRoute<SaveServiceGroupResponse>()({
  endpoint: 'POST /internal/apm/service-group',
  params: t.type({
    query: t.union([t.partial({ serviceGroupId: t.string }), t.undefined]),
    body: t.type({
      groupName: t.string,
      kuery: t.string,
      description: t.union([t.string, t.undefined]),
      color: t.union([t.string, t.undefined]),
    }),
  }),
});
