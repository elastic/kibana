/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAgentSkills } from './use_agent_skills';

/** IDs of the skills an agent inherits from its type, which its own configuration does not list. */
export const useInheritedSkillIds = (agentId?: string) => {
  const { skills, isLoading } = useAgentSkills({ agentId });

  const inheritedSkillIds = useMemo(
    () => new Set(skills.filter(({ is_default: isDefault }) => isDefault).map(({ id }) => id)),
    [skills]
  );

  return { inheritedSkillIds, isLoading };
};
