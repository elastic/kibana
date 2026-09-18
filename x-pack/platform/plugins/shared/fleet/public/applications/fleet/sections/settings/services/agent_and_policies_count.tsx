/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendGetOutputAgentPolicyCount } from '../../../hooks';
import type { Output } from '../../../types';

export async function getAgentAndPolicyCountForOutput(output: Output) {
  const result = await sendGetOutputAgentPolicyCount(output.id);

  if (result.error) {
    throw result.error;
  }

  return {
    agentPolicyCount: result.data!.agentPolicyCount,
    agentCount: result.data!.agentCount,
  };
}
