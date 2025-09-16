/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { EuiSelectableTemplateSitewideOption } from '@elastic/eui';
import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { SearchListItem } from './search_list_item';
import { SearchListTitle } from './search_list_title';

// Search List Component  
export interface SearchListProps {
  options: EuiSelectableTemplateSitewideOption[];
  searchValue: string;
  onOptionClick: (option: EuiSelectableTemplateSitewideOption, event: React.MouseEvent) => void;
  isLoading?: boolean;
  emptyMessage?: React.ReactNode;
  errorMessage?: React.ReactNode;
  customComponents?: React.ReactNode[];
  showSuggestedTitle?: boolean;
}

export const SearchList: React.FC<SearchListProps> = ({
  options,
  searchValue,
  onOptionClick,
  isLoading = false,
  emptyMessage,
  errorMessage,
  customComponents = [],
  showSuggestedTitle = false
}) => {
  const { euiTheme } = useEuiTheme();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!options.length) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => (prev + 1) % options.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => prev <= 0 ? options.length - 1 : prev - 1);
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && options[selectedIndex]) {
          onOptionClick(options[selectedIndex], event as any);
        }
        break;
      case 'Escape':
        setSelectedIndex(-1);
        break;
    }
  }, [options, selectedIndex, onOptionClick]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.focus();
    }
  }, [options]);

  if (errorMessage) {
    return (
      <div css={css`
        height: 600px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        text-align: center;
      `}>
        {errorMessage}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div css={css`
        height: 600px;
        display: flex;
        justify-content: center;
        align-items: center;
      `}>
        <EuiLoadingSpinner size="xl" />
      </div>
    );
  }

  if (!options.length && !customComponents.length) {
    return (
      <div css={css`
        height: 600px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        text-align: center;
      `}>
        {emptyMessage || 'No results found'}
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      role="listbox"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      css={css`
        height: 600px;
        overflow-y: auto;
        outline: none;
        
        &::-webkit-scrollbar {
          width: 8px;
        }
        
        &::-webkit-scrollbar-track {
          background: ${euiTheme.colors.lightestShade};
          border-radius: 4px;
        }
        
        &::-webkit-scrollbar-thumb {
          background: ${euiTheme.colors.lightShade};
          border-radius: 4px;
        }
        
        &::-webkit-scrollbar-thumb:hover {
          background: ${euiTheme.colors.mediumShade};
        }
      `}
      data-test-subj="custom-search-list"
    >
      {/* Show Suggested title if enabled and we have content */}
      {showSuggestedTitle && (customComponents.length > 0 || options.length > 0) && (
        <SearchListTitle title="Suggested" />
      )}
      
      {/* Custom components first */}
      {customComponents.map((component, index) => (
        <div key={`custom-${index}`} css={css`margin-bottom: 4px;`}>
          {component}
        </div>
      ))}
      
      {/* Search options */}
      {options.map((option, index) => (
        <div key={option.key || index} >
          <SearchListItem
            option={option}
            searchValue={searchValue}
            isSelected={index === selectedIndex}
            onClick={onOptionClick}
          />
        </div>
      ))}
    </div>
  );
};
