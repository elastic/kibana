/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleCreateSearchProps } from '../components/rule_create_search';
import { getCreateRuleWithAgentPrompt } from '../constants';
import { useAreAgentBuilderSkillsAvailable } from './use_are_agent_builder_skills_available';
import { useOpenAgentBuilderChat } from './use_open_agent_builder_chat';
import { useUnifiedRuleCreationEnabled } from './use_unified_rule_creation_enabled';

// Sections are wired by their own issues; until then the search shows no results.
const NO_SEARCH_SECTIONS: RuleCreateSearchProps['sections'] = {};
const ignoreSearchQuery = () => {};

interface UseRuleCreateSearchOptions {
  /** Called before the typed text is sent to the agent, to close the create rule flyout. */
  onClose: () => void;
}

/**
 * Props for the create rule search, or `undefined` while the unified rule creation flag is off.
 * Without Agent Builder access the search cannot send to the agent.
 */
export const useRuleCreateSearch = ({
  onClose,
}: UseRuleCreateSearchOptions): RuleCreateSearchProps | undefined => {
  const isUnifiedRuleCreationEnabled = useUnifiedRuleCreationEnabled();
  const areAgentBuilderSkillsAvailable = useAreAgentBuilderSkillsAvailable();
  const openAgentBuilderChat = useOpenAgentBuilderChat();

  if (!isUnifiedRuleCreationEnabled) {
    return undefined;
  }

  return {
    sections: NO_SEARCH_SECTIONS,
    onQueryChange: ignoreSearchQuery,
    onSendToAgent: areAgentBuilderSkillsAvailable
      ? (text) => {
          onClose();
          openAgentBuilderChat(getCreateRuleWithAgentPrompt(text));
        }
      : undefined,
  };
};
