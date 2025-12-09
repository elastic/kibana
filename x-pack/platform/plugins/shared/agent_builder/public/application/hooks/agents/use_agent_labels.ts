/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAgentBuilderAgents } from './use_agents';

export const useAgentLabels = () => {
  const { agents, isLoading, error } = useAgentBuilderAgents();

  const labels = useMemo(() => {
    if (!agents || agents.length === 0) {
      return [];
    }

    // Extract all labels from all agents and create a unique set
    const allLabels = new Set<string>();

    agents.forEach((agent) => {
      if (agent.labels && Array.isArray(agent.labels)) {
        agent.labels.forEach((label) => {
          allLabels.add(label.trim());
        });
      }
    });

    // Convert to array and sort alphabetically
    return Array.from(allLabels).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [agents]);

  return {
    labels,
    isLoading,
    error,
  };
};
