/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useRef } from 'react';
import { usePrefetchSkills } from './menus/skills/use_prefetch_skills';
import { usePrefetchSml } from './menus/sml/use_prefetch_sml';
import { useAgentId } from '../../../../../hooks/use_conversation';
import { useAgentBuilderAgentById } from '../../../../../hooks/agents/use_agent_by_id';
import { buildSmlScopingFromAgent } from './utils/sml_filters';

/**
 * Prefetches data for all command menus on first invocation.
 * Re-prefetches SML when the agent's constraints changes (e.g. after the async
 * agent fetch resolves with connector_ids).
 * Returns a callback that should be called when the editor receives focus.
 */
const NOT_YET_PREFETCHED = Symbol('not-yet-prefetched');

export const useCommandMenuPrefetch = () => {
  const hasPrefetchedSkills = useRef(false);
  const lastSmlScopingJson = useRef<string | symbol>(NOT_YET_PREFETCHED);
  const agentId = useAgentId();
  const { agent } = useAgentBuilderAgentById(agentId);
  const constraints = useMemo(() => buildSmlScopingFromAgent(agent), [agent]);
  const prefetchSkills = usePrefetchSkills();
  const prefetchSml = usePrefetchSml(constraints);

  return useCallback(() => {
    if (!hasPrefetchedSkills.current) {
      hasPrefetchedSkills.current = true;
      prefetchSkills();
    }

    const scopingJson = constraints ? JSON.stringify(constraints) : '';
    if (scopingJson !== lastSmlScopingJson.current) {
      lastSmlScopingJson.current = scopingJson;
      prefetchSml();
    }
  }, [prefetchSkills, prefetchSml, constraints]);
};
