/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { RuleCreateSearchSectionResult } from '../components/rule_create_search';
import { getCreateRuleWithAgentPrompt } from '../constants';
import { useRuleCreateSearch } from './use_rule_create_search';
import type { TemplatesSearchSectionHandlers } from './use_templates_search_section';

let mockUnifiedRuleCreationEnabled = true;
let mockAgentBuilderAvailable = true;
let mockCanWriteRules = true;
let mockExperimentalFeaturesEnabled = true;
const mockOpenAgentBuilderChat = jest.fn();
const mockTemplatesSection: RuleCreateSearchSectionResult = {
  items: [{ id: 'tpl-cpu', title: 'High CPU', onSelect: jest.fn() }],
  isLoading: false,
};
const mockUseTemplatesSearchSection = jest.fn<
  RuleCreateSearchSectionResult,
  [string, TemplatesSearchSectionHandlers]
>(() => mockTemplatesSection);

jest.mock('@kbn/core-di-browser', () => ({
  ...jest.requireActual('@kbn/core-di-browser'),
  useService: () => ({
    canWrite: (feature: string) => (feature === 'rules' ? mockCanWriteRules : false),
  }),
}));
jest.mock('./use_unified_rule_creation_enabled', () => ({
  useUnifiedRuleCreationEnabled: () => mockUnifiedRuleCreationEnabled,
}));
jest.mock('./use_are_agent_builder_skills_available', () => ({
  useAreAgentBuilderSkillsAvailable: () => mockAgentBuilderAvailable,
}));
jest.mock('./use_open_agent_builder_chat', () => ({
  useOpenAgentBuilderChat: () => mockOpenAgentBuilderChat,
}));
jest.mock('./use_alerting_v2_experimental_features', () => ({
  useAlertingV2ExperimentalFeatures: () => mockExperimentalFeaturesEnabled,
}));
jest.mock('./use_templates_search_section', () => ({
  useTemplatesSearchSection: (query: string, handlers: TemplatesSearchSectionHandlers) =>
    mockUseTemplatesSearchSection(query, handlers),
}));

describe('useRuleCreateSearch', () => {
  const onClose = jest.fn();
  const onCreateEsqlRule = jest.fn();
  const onCreateThresholdRule = jest.fn();
  const onBuildSequence = jest.fn();
  const onSelectTemplate = jest.fn();

  const defaultOptions = {
    onClose,
    onCreateEsqlRule,
    onCreateThresholdRule,
    onBuildSequence,
    onSelectTemplate,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnifiedRuleCreationEnabled = true;
    mockAgentBuilderAvailable = true;
    mockCanWriteRules = true;
    mockExperimentalFeaturesEnabled = true;
    mockUseTemplatesSearchSection.mockReturnValue(mockTemplatesSection);
  });

  it('returns undefined while the unified rule creation flag is off', () => {
    mockUnifiedRuleCreationEnabled = false;

    const { result } = renderHook(() => useRuleCreateSearch(defaultOptions));

    expect(result.current).toBeUndefined();
  });

  it('filters the universal section as the query changes and triggers the selected handler', () => {
    const { result } = renderHook(() => useRuleCreateSearch(defaultOptions));

    expect(result.current?.sections.universal?.items).toEqual([]);

    act(() => {
      result.current?.onQueryChange('threshol');
    });

    expect(result.current?.sections.universal?.items.map((item) => item.id)).toEqual(['threshold']);

    result.current?.sections.universal?.items[0].onSelect();
    expect(onCreateThresholdRule).toHaveBeenCalledTimes(1);
  });

  it('wires the templates section and forwards query updates and selection handler', () => {
    const { result } = renderHook(() => useRuleCreateSearch(defaultOptions));

    expect(mockUseTemplatesSearchSection).toHaveBeenLastCalledWith('', { onSelectTemplate });
    expect(result.current?.sections['universal.templates']).toBe(mockTemplatesSection);

    act(() => {
      result.current?.onQueryChange('cpu');
    });

    expect(mockUseTemplatesSearchSection).toHaveBeenLastCalledWith('cpu', { onSelectTemplate });
  });

  it('keeps onQueryChange stable across renders so the search does not re-report the query', () => {
    const { result, rerender } = renderHook(() => useRuleCreateSearch(defaultOptions));
    const firstOnQueryChange = result.current?.onQueryChange;

    rerender();

    expect(result.current?.onQueryChange).toBe(firstOnQueryChange);
  });

  it('closes the flyout and opens the side chat with the request in the prompt on send', () => {
    const { result } = renderHook(() => useRuleCreateSearch(defaultOptions));

    result.current?.onSendToAgent?.('alert on cpu');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockOpenAgentBuilderChat).toHaveBeenCalledWith(
      getCreateRuleWithAgentPrompt('alert on cpu')
    );
  });

  it('cannot send to the agent without Agent Builder access', () => {
    mockAgentBuilderAvailable = false;

    const { result } = renderHook(() => useRuleCreateSearch(defaultOptions));

    expect(result.current).toBeDefined();
    expect(result.current?.onSendToAgent).toBeUndefined();
  });
});
