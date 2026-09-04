/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentAiIndexEntry } from '../../../common/http_api/agents';

export const buildEffectiveAgentAiIndices = ({
  inherited,
  assigned,
}: {
  inherited: string[];
  assigned: string[];
}): AgentAiIndexEntry[] => {
  const inheritedSet = new Set(inherited);

  return [
    ...inherited.map((id) => ({ id, is_default: true })),
    ...assigned.filter((id) => !inheritedSet.has(id)).map((id) => ({ id, is_default: false })),
  ];
};
