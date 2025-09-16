/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounce } from 'lodash';
import { useCallback, useEffect, useState } from 'react';
import type { WorkflowSuggestion } from '../../../../../services/workflow_autocomplete/workflow_autocomplete_service';
import { useKibana } from '../../../../hooks/use_kibana';
import { useOnechatServices } from '../../../../hooks/use_onechat_service';

export interface UseWorkflowAutocompleteProps {
  input: string;
  cursorPosition: number;
}

export interface WorkflowAutocompleteState {
  isVisible: boolean;
  suggestions: WorkflowSuggestion[];
  selectedIndex: number;
  triggerType: 'slash' | 'at' | null;
  triggerPosition: number;
  query: string;
}

const TRIGGER_PATTERNS = {
  slash: /\/workflow\s*([^@/\s]*?)$/i,
  at: /@workflow\s*([^@/\s]*?)$/i,
};

export const useWorkflowAutocomplete = ({ input, cursorPosition }: UseWorkflowAutocompleteProps) => {
  const { startDependencies } = useOnechatServices();
  const { services: { http } } = useKibana();
  const [state, setState] = useState<WorkflowAutocompleteState>({
    isVisible: false,
    suggestions: [],
    selectedIndex: 0,
    triggerType: null,
    triggerPosition: 0,
    query: '',
  });

  // Debounced function to fetch suggestions
  const fetchSuggestions = useCallback(
    debounce(async (query: string) => {
      console.log('Fetching workflow suggestions for query:', query);
      try {
        const response = await http.get<{ workflows: WorkflowSuggestion[] }>(
          '/api/onechat/workflows/autocomplete',
          {
            query: { query, limit: 10 },
          }
        );
        
        console.log('API response:', response);
        
        setState((prev) => {
          const newState = {
            ...prev,
            suggestions: response.workflows || [],
          };
          console.log('Updated state:', newState);
          return newState;
        });
      } catch (error) {
        console.error('Failed to fetch workflow suggestions:', error);
        setState((prev) => ({
          ...prev,
          suggestions: [],
        }));
      }
    }, 300),
    [http]
  );

  // Check for trigger patterns and update state
  useEffect(() => {
    const textBeforeCursor = input.slice(0, cursorPosition);
    
    // Debug logging
    console.log('Workflow autocomplete check:', {
      input,
      cursorPosition,
      textBeforeCursor,
    });
    
    // Check for slash command
    const slashMatch = textBeforeCursor.match(TRIGGER_PATTERNS.slash);
    console.log('Slash match:', slashMatch);
    if (slashMatch) {
      const query = slashMatch[1] || '';
      const triggerPosition = textBeforeCursor.lastIndexOf('/workflow');
      
      setState(prev => {
        const newState = {
          ...prev,
          isVisible: true,
          triggerType: 'slash' as const,
          triggerPosition,
          query,
          selectedIndex: 0,
        };
        console.log('Setting slash state:', newState);
        return newState;
      });
      
      fetchSuggestions(query);
      return;
    }

    // Check for @ mention
    const atMatch = textBeforeCursor.match(TRIGGER_PATTERNS.at);
    console.log('At match:', atMatch);
    if (atMatch) {
      const query = atMatch[1] || '';
      const triggerPosition = textBeforeCursor.lastIndexOf('@workflow');
      
      setState(prev => {
        const newState = {
          ...prev,
          isVisible: true,
          triggerType: 'at' as const,
          triggerPosition,
          query,
          selectedIndex: 0,
        };
        console.log('Setting @ state:', newState);
        return newState;
      });
      
      fetchSuggestions(query);
      return;
    }

    // No trigger found, hide autocomplete
    setState(prev => ({
      ...prev,
      isVisible: false,
      triggerType: null,
      suggestions: [],
      selectedIndex: 0,
    }));
  }, [input, cursorPosition, fetchSuggestions]);

  const selectSuggestion = useCallback((suggestion: WorkflowSuggestion) => {
    // Create a Slack-like workflow tag that works with multi-word names
    // Wrap multi-word names in quotes to preserve them as a single unit
    const workflowName = suggestion.name.includes(' ') ? `"${suggestion.name}"` : suggestion.name;
    
    // Add input placeholders if the workflow has inputs
    let inputPlaceholders = '';
    if (suggestion.inputs && suggestion.inputs.length > 0) {
      const placeholders = suggestion.inputs.map(input => {
        const placeholder = input.required 
          ? `${input.name}: <${input.type}>` 
          : `[${input.name}: <${input.type}>]`;
        return placeholder;
      }).join(', ');
      inputPlaceholders = ` with {${placeholders}}`;
    }
    
    const workflowTag = state.triggerType === 'slash' 
      ? `/workflow ${workflowName}${inputPlaceholders} ` 
      : `@workflow ${workflowName}${inputPlaceholders} `;
    
    return {
      newInput: input.slice(0, state.triggerPosition) + 
        workflowTag +
        input.slice(cursorPosition),
      newCursorPosition: state.triggerPosition + workflowTag.length,
    };
  }, [input, cursorPosition, state.triggerPosition, state.triggerType]);

  const navigateSelection = useCallback((direction: 'up' | 'down') => {
    setState(prev => {
      const newIndex = direction === 'up' 
        ? Math.max(0, prev.selectedIndex - 1)
        : Math.min(prev.suggestions.length - 1, prev.selectedIndex + 1);
      
      return {
        ...prev,
        selectedIndex: newIndex,
      };
    });
  }, []);

  const getSelectedSuggestion = useCallback(() => {
    return state.suggestions[state.selectedIndex] || null;
  }, [state.suggestions, state.selectedIndex]);

  const hideSuggestions = useCallback(() => {
    setState(prev => ({
      ...prev,
      isVisible: false,
      suggestions: [],
      selectedIndex: 0,
    }));
  }, []);

  return {
    ...state,
    selectSuggestion,
    navigateSelection,
    getSelectedSuggestion,
    hideSuggestions,
  };
};
