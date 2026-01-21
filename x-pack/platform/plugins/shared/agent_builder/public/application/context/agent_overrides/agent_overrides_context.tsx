/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ToolSelection } from '@kbn/agent-builder-common';
import type { RuntimeAgentConfigurationOverrides } from '@kbn/agent-builder-common';
import { useAgentId } from '../../hooks/use_conversation';
import { useAgentBuilderAgentById } from '../../hooks/agents/use_agent_by_id';

/** Extract tool IDs from agent configuration tools */
const extractToolIds = (tools: ToolSelection[] | undefined): Set<string> => {
  if (!tools) return new Set();
  const ids = new Set<string>();
  for (const selection of tools) {
    for (const id of selection.tool_ids) {
      ids.add(id);
    }
  }
  return ids;
};

/** Compare two sets for equality */
const areSetsEqual = (a: Set<string>, b: Set<string>): boolean => {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
};

interface AgentOverridesContextValue {
  /** Current instructions value (edited or original) */
  instructions: string;
  /** Current enabled tool IDs */
  enabledToolIds: Set<string>;
  /** Whether user has made changes */
  isDirty: boolean;
  /** Overrides to send to API (only if dirty) */
  overrides: RuntimeAgentConfigurationOverrides | undefined;
  /** Set custom instructions */
  setInstructions: (instructions: string) => void;
  /** Toggle a tool's enabled state */
  toggleTool: (toolId: string) => void;
  /** Reset overrides to original agent values */
  resetOverrides: () => void;
}

const AgentOverridesContext = createContext<AgentOverridesContextValue | undefined>(undefined);

interface AgentOverridesProviderProps {
  children: React.ReactNode;
}

export const AgentOverridesProvider: React.FC<AgentOverridesProviderProps> = ({ children }) => {
  const agentId = useAgentId();
  const { agent, isLoading: isAgentLoading } = useAgentBuilderAgentById(agentId);

  // Edited values
  const [instructions, setInstructions] = useState<string>('');
  const [enabledToolIds, setEnabledToolIds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Original values from agent
  const originalInstructions = agent?.configuration?.instructions ?? '';
  const originalToolIds = extractToolIds(agent?.configuration?.tools);

  // Initialize/reset state from current agent data
  const initializeFromAgent = useCallback(() => {
    if (agent && !isAgentLoading) {
      setInstructions(agent.configuration?.instructions ?? '');
      setEnabledToolIds(extractToolIds(agent.configuration?.tools));
      setIsInitialized(true);
    }
  }, [agent, isAgentLoading]);

  // Re-initialize when agent changes
  useEffect(() => {
    setIsInitialized(false);
  }, [agentId]);

  useEffect(() => {
    if (!isInitialized) {
      initializeFromAgent();
    }
  }, [isInitialized, initializeFromAgent]);

  const areInstructionsDirty = instructions !== originalInstructions;
  const areToolsDirty = !areSetsEqual(enabledToolIds, originalToolIds);

  const isDirty = useMemo(() => {
    if (!isInitialized) return false;
    return areInstructionsDirty || areToolsDirty;
  }, [isInitialized, areInstructionsDirty, areToolsDirty]);

  const resetOverrides = useCallback(() => {
    initializeFromAgent();
  }, [initializeFromAgent]);

  const toggleTool = useCallback((toolId: string) => {
    setEnabledToolIds((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
  }, []);

  const overrides = useMemo<RuntimeAgentConfigurationOverrides | undefined>(() => {
    if (!isDirty) return undefined; // Only provide overrides if dirty

    const result: RuntimeAgentConfigurationOverrides = {};

    if (areInstructionsDirty) {
      result.instructions = instructions;
    }

    if (areToolsDirty) {
      result.tools = [{ tool_ids: Array.from(enabledToolIds) }];
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }, [areInstructionsDirty, areToolsDirty, instructions, enabledToolIds, isDirty]);

  const value = useMemo<AgentOverridesContextValue>(
    () => ({
      instructions,
      enabledToolIds,
      isDirty,
      overrides,
      setInstructions,
      toggleTool,
      resetOverrides,
    }),
    [instructions, enabledToolIds, isDirty, overrides, setInstructions, toggleTool, resetOverrides]
  );

  return <AgentOverridesContext.Provider value={value}>{children}</AgentOverridesContext.Provider>;
};

export const useAgentOverrides = (): AgentOverridesContextValue => {
  const context = useContext(AgentOverridesContext);
  if (!context) {
    throw new Error('useAgentOverrides must be used within an AgentOverridesProvider');
  }
  return context;
};
