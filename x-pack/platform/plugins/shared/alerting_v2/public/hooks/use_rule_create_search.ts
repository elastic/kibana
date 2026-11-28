/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import type { RuleCreateSearchProps } from '../components/rule_create_search';
import { getCreateRuleWithAgentPrompt } from '../constants';
import { useAreAgentBuilderSkillsAvailable } from './use_are_agent_builder_skills_available';
import { useOpenAgentBuilderChat } from './use_open_agent_builder_chat';
import {
  useTemplatesSearchSection,
  type TemplatesSearchSectionHandlers,
} from './use_templates_search_section';
import { useUnifiedRuleCreationEnabled } from './use_unified_rule_creation_enabled';
import {
  useUniversalSearchSection,
  type UniversalSearchSectionHandlers,
} from './use_universal_search_section';

interface UseRuleCreateSearchOptions
  extends UniversalSearchSectionHandlers,
    TemplatesSearchSectionHandlers {
  /** Called before the typed text is sent to the agent, to close the create rule flyout. */
  onClose: () => void;
}

/**
 * Props for the create rule search, or `undefined` while the unified rule creation flag is off.
 * Without Agent Builder access the search cannot send to the agent.
 */
export const useRuleCreateSearch = ({
  onClose,
  onCreateEsqlRule,
  onCreateThresholdRule,
  onBuildSequence,
  onSelectTemplate,
}: UseRuleCreateSearchOptions): RuleCreateSearchProps | undefined => {
  const isUnifiedRuleCreationEnabled = useUnifiedRuleCreationEnabled();
  const areAgentBuilderSkillsAvailable = useAreAgentBuilderSkillsAvailable();
  const openAgentBuilderChat = useOpenAgentBuilderChat();
  const [query, setQuery] = useState('');

  const universalSection = useUniversalSearchSection(query, {
    onCreateEsqlRule,
    onCreateThresholdRule,
    onBuildSequence,
  });
  const templatesSection = useTemplatesSearchSection(query, { onSelectTemplate });

  const sections = useMemo<RuleCreateSearchProps['sections']>(
    () => ({
      universal: universalSection,
      'universal.templates': templatesSection,
    }),
    [templatesSection, universalSection]
  );

  if (!isUnifiedRuleCreationEnabled) {
    return undefined;
  }

  return {
    sections,
    onQueryChange: setQuery,
    onSendToAgent: areAgentBuilderSkillsAvailable
      ? (text) => {
          onClose();
          openAgentBuilderChat(getCreateRuleWithAgentPrompt(text));
        }
      : undefined,
  };
};
