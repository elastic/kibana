/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { WorkflowSuggestion } from '../../../../../services/workflow_autocomplete/workflow_autocomplete_service';
import { useKibana } from '../../../../hooks/use_kibana';

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
  const { services: { http } } = useKibana();
  const [state, setState] = useState<ShortcutMenuState>({
    isVisible: false,
    level: 'main',
    selectedIndex: 0,
    triggerPosition: 0,
    items: [],
  });
  const [loadedWorkflowSuggestions, setLoadedWorkflowSuggestions] = useState<WorkflowSuggestion[]>([]);
  
  // Load workflow suggestions when needed
  const loadWorkflowSuggestions = useCallback(async () => {
    console.log('Loading workflow suggestions...');
    try {
      const response = await http.get<{ workflows: WorkflowSuggestion[] }>(
        '/api/onechat/workflows/autocomplete',
        {
          query: { query: '', limit: 10 },
        }
      );
      console.log('Loaded workflow suggestions:', response.workflows);
      setLoadedWorkflowSuggestions(response.workflows || []);
      return response.workflows || [];
    } catch (error) {
      console.error('Failed to load workflow suggestions:', error);
      return [];
    }
  }, [http]);

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
      const items = prev.level === 'main' 
        ? prev.items 
        : (loadedWorkflowSuggestions.length > 0 ? loadedWorkflowSuggestions : workflowSuggestions || []);
      const newIndex = direction === 'up' 
        ? Math.max(0, prev.selectedIndex - 1)
        : Math.min(items.length - 1, prev.selectedIndex + 1);
      
      return { ...prev, selectedIndex: newIndex };
    });
  }, [workflowSuggestions, loadedWorkflowSuggestions]);

  const selectItem = useCallback(() => {
    console.log('selectItem called:', {
      level: state.level,
      selectedIndex: state.selectedIndex,
      items: state.items,
      workflowSuggestions: workflowSuggestions?.length
    });
    
    if (state.level === 'main') {
      const selectedItem = state.items[state.selectedIndex];
      console.log('Selected item:', selectedItem);
      
      if (selectedItem?.action === 'workflow') {
        console.log('Switching to workflow level');
        // Load workflow suggestions if not already loaded
        if (loadedWorkflowSuggestions.length === 0) {
          loadWorkflowSuggestions().then((suggestions) => {
            setState(prev => ({
              ...prev,
              level: 'workflow',
              selectedIndex: 0,
              workflowSuggestions: suggestions,
            }));
          });
        } else {
          setState(prev => ({
            ...prev,
            level: 'workflow',
            selectedIndex: 0,
            workflowSuggestions: loadedWorkflowSuggestions,
          }));
        }
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
      const currentWorkflows = loadedWorkflowSuggestions.length > 0 ? loadedWorkflowSuggestions : workflowSuggestions;
      const selectedWorkflow = currentWorkflows[state.selectedIndex];
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
        
        const replacement = `/workflow ${workflowName}${inputPlaceholders}`;
        const finalInput = input.slice(0, state.triggerPosition) + replacement + ' ' + input.slice(cursorPosition);
        return {
          newInput: finalInput,
          newCursorPosition: state.triggerPosition + replacement.length + 1, // +1 for the space
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
      const currentWorkflows = loadedWorkflowSuggestions.length > 0 ? loadedWorkflowSuggestions : workflowSuggestions;
      console.log('Getting current workflow items:', currentWorkflows?.length);
      return currentWorkflows.map(workflow => ({
        id: workflow.id,
        label: workflow.name,
        description: workflow.description || 'No description',
        icon: '🔄',
      }));
    }
    return [];
  }, [state.level, state.items, workflowSuggestions, loadedWorkflowSuggestions]);

  return {
    ...state,
    currentItems: getCurrentItems(),
    navigateSelection,
    selectItem,
    goBack,
    hideMenu,
  };
};
