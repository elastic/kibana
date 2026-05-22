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
import { buildSmlFiltersFromAgent } from './utils/sml_filters';

/**
 * Prefetches data for all command menus on first invocation.
 * Re-prefetches SML when the agent's filters change (e.g. after the async
 * agent fetch resolves with connector_ids).
 * Returns a callback that should be called when the editor receives focus.
 */
const NOT_YET_PREFETCHED = Symbol('not-yet-prefetched');

export const useCommandMenuPrefetch = () => {
  const hasPrefetchedSkills = useRef(false);
  const lastSmlFiltersJson = useRef<string | symbol>(NOT_YET_PREFETCHED);
  const agentId = useAgentId();
  const { agent } = useAgentBuilderAgentById(agentId);
  const filters = useMemo(() => buildSmlFiltersFromAgent(agent), [agent]);
  const prefetchSkills = usePrefetchSkills();
  const prefetchSml = usePrefetchSml(filters);

  return useCallback(() => {
    if (!hasPrefetchedSkills.current) {
      hasPrefetchedSkills.current = true;
      prefetchSkills();
    }

    const filtersJson = filters ? JSON.stringify(filters) : '';
    if (filtersJson !== lastSmlFiltersJson.current) {
      lastSmlFiltersJson.current = filtersJson;
      prefetchSml();
    }
  }, [prefetchSkills, prefetchSml, filters]);
};
