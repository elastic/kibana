/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const getAgentStatusForAgentPolicyRequestParamsSchema = t.unknown;

export type GetAgentStatusForAgentPolicyRequestParamsSchema = t.OutputOf<
  typeof getAgentStatusForAgentPolicyRequestParamsSchema
>;

export const getAgentStatusForAgentPolicyRequestQuerySchema = t.type({
  policyId: t.string,
  kuery: t.union([t.string, t.undefined]),
});

export type GetAgentStatusForAgentPolicyRequestQuerySchema = t.OutputOf<
  typeof getAgentStatusForAgentPolicyRequestQuerySchema
>;
