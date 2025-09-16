/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSelectableTemplateSitewideOption } from '@elastic/eui';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

// Custom List Item Component
export interface SearchListItemProps {
  option: EuiSelectableTemplateSitewideOption;
  searchValue: string;
  isSelected?: boolean;
  onClick: (option: EuiSelectableTemplateSitewideOption, event: React.MouseEvent) => void;
  onKeyDown?: (option: EuiSelectableTemplateSitewideOption, event: React.KeyboardEvent) => void;
  customRender?: (option: EuiSelectableTemplateSitewideOption, searchValue: string) => React.ReactElement;
}

export const SearchListItem: React.FC<SearchListItemProps> = ({
  option,
  searchValue,
  isSelected = false,
  onClick,
  onKeyDown,
  customRender
}) => {
  const { euiTheme } = useEuiTheme();
  const { label, meta, icon, append, type } = option;

  // Determine the right-side label and icon based on item type
  const getRightSideContent = () => {
    // Check if this is an information/documentation type
    if (type === 'information' || (option as any).itemType === 'information') {
      return {
        label: 'Documentation',
        icon: 'popout'
      };
    }
    
    // For existing navigation types (applications, dashboards, etc.), show "Navigate"
    if (type === 'application' || type === 'dashboard' || type === 'visualization' || 
        type === 'search' || type === 'index-pattern' || type === 'lens' || 
        type === 'map' || type === 'canvas-workpad' || type === 'integration' ||
        (option as any).itemType === 'navigate') {
      return {
        label: 'Navigate',
        icon: null
      };
    }

    // For suggestions, keep the original meta
    if (type === '__suggestion__') {
      return null; // Use original meta
    }

    // Default fallback - use original meta or show Navigate
    return {
      label: 'Navigate',
      icon: null
    };
  };

  const rightSideContent = getRightSideContent();

  const handleClick = (event: React.MouseEvent) => {
    onClick(option, event);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(option, event as any);
    }
    onKeyDown?.(option, event);
  };

  // If custom render function is provided, use it
  if (customRender) {
    return (
      <div
        role="option"
        tabIndex={0}
        aria-selected={isSelected}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        css={css`
          cursor: pointer;
          outline: none;
        `}
        data-test-subj={`nav-search-option-${option.key}`}
      >
        {customRender(option, searchValue)}
      </div>
    );
  }

  return (
    <div
      role="option"
      tabIndex={0}
      aria-selected={isSelected}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      css={css`
        display: flex;
        align-items: center;
        width: 100%;
        gap: 8px;
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
        transition: background-color 0.2s ease;
        outline: none;
        background-color: ${euiTheme.colors.backgroundBasePlain};
        
        &:hover {
          background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }
      
      `}
      data-test-subj={`nav-search-option-${option.key}`}
    >
      {/* Icon */}
      {icon && (
        <EuiIcon
          type={icon.type}
          size="m"
          css={css`
            flex-shrink: 0;
          `}
        />
      )}
      
      {/* Content container with title and meta in one line */}
      <div
        css={css`
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          min-width: 0;
        `}
      >
        {/* Title on the left */}
        <div
          css={css`
            flex: 1;
            min-width: 0;
          `}
        >
          <EuiText size="s" color={isSelected ? 'ghost' : 'default'}>
            <span dangerouslySetInnerHTML={{ 
              __html: label?.replace(
                new RegExp(`(${searchValue})`, 'gi'), 
                '<mark>$1</mark>'
              ) || '' 
            }} />
          </EuiText>
        </div>
        
        {/* Meta on the right */}
        <div
          css={css`
            flex-shrink: 0;
            color: ${isSelected ? euiTheme.colors.ghost : euiTheme.colors.subduedText};
            margin-left: 16px;
            display: flex;
            align-items: center;
            gap: 4px;
          `}
        >
          {rightSideContent ? (
            <>
              <span>{rightSideContent.label}</span>
              {rightSideContent.icon && (
                <EuiIcon 
                  type={rightSideContent.icon} 
                  size="s"
                  color={isSelected ? 'ghost' : 'subdued'}
                />
              )}
            </>
          ) : (
            // Fallback to original meta for suggestions
            meta && meta.length > 0 && (
              <>
                {meta.map((metaItem, index) => (
                  <span key={index}>
                    {metaItem.text}
                    {index < meta.length - 1 && ' • '}
                  </span>
                ))}
              </>
            )
          )}
        </div>
      </div>
      
      {/* Append content (tags, etc.) */}
      {append && (
        <div
          css={css`
            flex-shrink: 0;
            margin-left: 8px;
          `}
        >
          {append}
        </div>
      )}
    </div>
  );
};
