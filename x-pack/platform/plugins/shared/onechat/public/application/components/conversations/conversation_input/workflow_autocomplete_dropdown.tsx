/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
    EuiFlexGroup,
    EuiFlexItem,
    EuiHighlight,
    EuiIcon,
    EuiPanel,
    EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import type { WorkflowSuggestion } from '../../../../services/workflow_autocomplete/workflow_autocomplete_service';

interface WorkflowAutocompleteDropdownProps {
  suggestions: WorkflowSuggestion[];
  selectedIndex: number;
  query: string;
  triggerType: 'slash' | 'at' | null;
  onSelect: (suggestion: WorkflowSuggestion) => void;
  position: { top: number; left: number };
}

export const WorkflowAutocompleteDropdown: React.FC<WorkflowAutocompleteDropdownProps> = ({
  suggestions,
  selectedIndex,
  query,
  triggerType,
  onSelect,
  position,
}) => {
  console.log('🎯 WorkflowAutocompleteDropdown rendering with:', {
    suggestions: suggestions?.length,
    triggerType,
    position,
    query
  });
  
  // Safety checks
  if (!suggestions || suggestions.length === 0 || !triggerType) {
    console.log('❌ Dropdown not rendering - failed safety checks:', {
      hasSuggestions: !!suggestions,
      suggestionsLength: suggestions?.length,
      triggerType
    });
    return null;
  }
  
  console.log('✅ Dropdown will render!');
  console.log('Position details:', position);
  console.log('Window dimensions:', { width: window.innerWidth, height: window.innerHeight });

  const itemStyles = css`
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;
    margin: 4px;
    
    &:hover {
      background-color: #f5f5f5;
    }
  `;

  const selectedItemStyles = css`
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;
    margin: 4px;
    background-color: #0070f3;
    color: white;
    
    &:hover {
      background-color: #0070f3;
    }
  `;

  const headerStyles = css`
    padding: 8px 12px;
    border-bottom: 1px solid #e0e0e0;
    background-color: #f8f8f8;
  `;

  // Calculate a safer position - limit to viewport bounds
  const safePosition = {
    top: Math.min(position.top, window.innerHeight - 300), // Keep within viewport height
    left: Math.min(position.left, window.innerWidth - 350), // Keep within viewport width
  };
  
  console.log('Safe position:', safePosition);
  
  const dropdownStyles = css`
    position: fixed;
    top: ${safePosition.top}px;
    left: ${safePosition.left}px;
    z-index: 9999;
    min-width: 300px;
    max-width: 400px;
    max-height: 300px;
    overflow-y: auto;
  `;
  
  return (
    <EuiPanel css={dropdownStyles} paddingSize="none" hasShadow={true} hasBorder={true}>
      <div css={headerStyles}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={triggerType === 'slash' ? 'console' : 'at'} size="s" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {triggerType === 'slash' ? 'Workflow Commands' : 'Workflow Mentions'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion.id}
          css={index === selectedIndex ? selectedItemStyles : itemStyles}
          onClick={() => onSelect(suggestion)}
          data-test-subj={`workflow-autocomplete-item-${suggestion.id}`}
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon 
                type="gear" 
                size="m" 
                color={index === selectedIndex ? 'ghost' : 'primary'} 
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
                <EuiFlexItem>
                  <EuiText size="s" color={index === selectedIndex ? 'ghost' : 'default'}>
                    <strong>
                      🔄 <EuiHighlight search={query} highlightAll={false}>
                        {suggestion.name || suggestion.id}
                      </EuiHighlight>
                    </strong>
                  </EuiText>
                </EuiFlexItem>
                {suggestion.description && (
                  <EuiFlexItem>
                    <EuiText size="xs" color={index === selectedIndex ? 'ghost' : 'subdued'}>
                      {suggestion.description}
                    </EuiText>
                  </EuiFlexItem>
                )}
                <EuiFlexItem>
                  <EuiText size="xs" color={index === selectedIndex ? 'ghost' : 'primary'}>
                    💬 Will insert: <code style={{backgroundColor: index === selectedIndex ? 'rgba(255,255,255,0.2)' : '#f5f5f5', padding: '2px 4px', borderRadius: '3px'}}>
                      {triggerType === 'slash' ? '/workflow' : '@workflow'} {suggestion.name}
                      {suggestion.inputs && suggestion.inputs.length > 0 && (
                        <span style={{ color: '#666' }}>
                          {' with {'}
                          {suggestion.inputs.map((inp, i) => (
                            <span key={i}>
                              {i > 0 && ', '}
                              {inp.required ? inp.name : `[${inp.name}]`}: &lt;{inp.type}&gt;
                            </span>
                          ))}
                          {'}'}
                        </span>
                      )}
                    </code>
                  </EuiText>
                </EuiFlexItem>
                {suggestion.inputs && suggestion.inputs.length > 0 && (
                  <EuiFlexItem>
                    <EuiText size="xs" color={index === selectedIndex ? 'ghost' : 'subdued'}>
                      📝 Inputs: {suggestion.inputs.map(inp => 
                        `${inp.name} (${inp.type})${inp.required ? ' *' : ''}`
                      ).join(', ')}
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      ))}
      
      <div css={headerStyles}>
        <EuiText size="xs" color="subdued" textAlign="center">
          ↑↓ to navigate • Enter to select • Esc to close
        </EuiText>
      </div>
    </EuiPanel>
  );
};