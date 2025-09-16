/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { WorkflowSuggestion } from '../../../../../services/workflow_autocomplete/workflow_autocomplete_service';

export interface ShortcutItem {
  id: string;
  label: string;
  description: string;
  icon?: string;
  action?: 'workflow' | 'search' | 'help';
}

export interface ShortcutMenuState {
  isVisible: boolean;
  level: 'main' | 'workflow';
  selectedIndex: number;
  triggerPosition: number;
  items: ShortcutItem[];
  workflowSuggestions?: WorkflowSuggestion[];
}

const MAIN_SHORTCUTS: ShortcutItem[] = [
  {
    id: 'workflow',
    label: 'workflow',
    description: 'Execute workflows and automations',
    icon: '🔄',
    action: 'workflow',
  },
  {
    id: 'search',
    label: 'search',
    description: 'Search through your data',
    icon: '🔍',
    action: 'search',
  },
  {
    id: 'help',
    label: 'help',
    description: 'Get help and documentation',
    icon: '❓',
    action: 'help',
  },
];

export interface UseShortcutMenuProps {
  input: string;
  cursorPosition: number;
  workflowSuggestions: WorkflowSuggestion[];
}

export const useShortcutMenu = ({ input, cursorPosition, workflowSuggestions }: UseShortcutMenuProps) => {
  const [state, setState] = useState<ShortcutMenuState>({
    isVisible: false,
    level: 'main',
    selectedIndex: 0,
    triggerPosition: 0,
    items: [],
  });

  // Check if cursor is at a "/" trigger
  const checkForShortcutTrigger = useCallback(() => {
    const textBeforeCursor = input.slice(0, cursorPosition);
    const slashMatch = textBeforeCursor.match(/\/(\w*)$/);
    
    if (slashMatch) {
      const triggerPosition = slashMatch.index!;
      const query = slashMatch[1] || '';
      
      // Filter main shortcuts based on query
      const filteredItems = MAIN_SHORTCUTS.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
      );
      
      setState(prev => ({
        ...prev,
        isVisible: true,
        level: 'main',
        triggerPosition,
        selectedIndex: 0,
        items: filteredItems,
      }));
      
      return true;
    }
    
    return false;
  }, [input, cursorPosition]);

  useEffect(() => {
    if (!checkForShortcutTrigger()) {
      setState(prev => ({ ...prev, isVisible: false }));
    }
  }, [checkForShortcutTrigger]);

  const navigateSelection = useCallback((direction: 'up' | 'down') => {
    setState(prev => {
      const items = prev.level === 'main' ? prev.items : workflowSuggestions || [];
      const newIndex = direction === 'up' 
        ? Math.max(0, prev.selectedIndex - 1)
        : Math.min(items.length - 1, prev.selectedIndex + 1);
      
      return { ...prev, selectedIndex: newIndex };
    });
  }, [workflowSuggestions]);

  const selectItem = useCallback(() => {
    if (state.level === 'main') {
      const selectedItem = state.items[state.selectedIndex];
      
      if (selectedItem?.action === 'workflow') {
        // Switch to workflow level
        setState(prev => ({
          ...prev,
          level: 'workflow',
          selectedIndex: 0,
          workflowSuggestions,
        }));
        return null; // Don't close menu, just switch level
      } else {
        // Handle other shortcuts
        const replacement = `/${selectedItem.label} `;
        return {
          newInput: input.slice(0, state.triggerPosition) + replacement + input.slice(cursorPosition),
          newCursorPosition: state.triggerPosition + replacement.length,
        };
      }
    } else if (state.level === 'workflow') {
      // Handle workflow selection
      const selectedWorkflow = workflowSuggestions[state.selectedIndex];
      if (selectedWorkflow) {
        const workflowName = selectedWorkflow.name.includes(' ') ? `"${selectedWorkflow.name}"` : selectedWorkflow.name;
        
        // Add input placeholders if the workflow has inputs
        let inputPlaceholders = '';
        if (selectedWorkflow.inputs && selectedWorkflow.inputs.length > 0) {
          const placeholders = selectedWorkflow.inputs.map(input => {
            const placeholder = input.required 
              ? `${input.name}: <${input.type}>` 
              : `[${input.name}: <${input.type}>]`;
            return placeholder;
          }).join(', ');
          inputPlaceholders = ` with {${placeholders}}`;
        }
        
        const replacement = `/workflow ${workflowName}${inputPlaceholders} `;
        return {
          newInput: input.slice(0, state.triggerPosition) + replacement + input.slice(cursorPosition),
          newCursorPosition: state.triggerPosition + replacement.length,
        };
      }
    }
    
    return null;
  }, [state, input, cursorPosition, workflowSuggestions]);

  const goBack = useCallback(() => {
    if (state.level === 'workflow') {
      setState(prev => ({
        ...prev,
        level: 'main',
        selectedIndex: 0,
        items: MAIN_SHORTCUTS,
      }));
    }
  }, [state.level]);

  const hideMenu = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: false }));
  }, []);

  const getCurrentItems = useCallback(() => {
    if (state.level === 'main') {
      return state.items;
    } else if (state.level === 'workflow') {
      return workflowSuggestions.map(workflow => ({
        id: workflow.id,
        label: workflow.name,
        description: workflow.description || 'No description',
        icon: '🔄',
      }));
    }
    return [];
  }, [state.level, state.items, workflowSuggestions]);

  return {
    ...state,
    currentItems: getCurrentItems(),
    navigateSelection,
    selectItem,
    goBack,
    hideMenu,
  };
};
