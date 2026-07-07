/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { agentConfigurationIntakeRt } from '@kbn/apm-common';
import { toBooleanRt } from '@kbn/io-ts-utils';
import { defineRoute } from '../types';

export const createOrUpdateAgentConfigurationRoute = defineRoute<void>()({
  endpoint: 'PUT /api/apm/settings/agent-configuration 2023-10-31',
  params: t.intersection([
    t.partial({ query: t.partial({ overwrite: toBooleanRt }) }),
    t.type({ body: agentConfigurationIntakeRt }),
  ]),
});
