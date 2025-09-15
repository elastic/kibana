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
export interface CustomListItemProps {
  option: EuiSelectableTemplateSitewideOption;
  searchValue: string;
  isSelected?: boolean;
  onClick: (option: EuiSelectableTemplateSitewideOption, event: React.MouseEvent) => void;
  onKeyDown?: (option: EuiSelectableTemplateSitewideOption, event: React.KeyboardEvent) => void;
  customRender?: (option: EuiSelectableTemplateSitewideOption, searchValue: string) => React.ReactElement;
}

export const CustomListItem: React.FC<CustomListItemProps> = ({
  option,
  searchValue,
  isSelected = false,
  onClick,
  onKeyDown,
  customRender
}) => {
  const { euiTheme } = useEuiTheme();
  const { label, meta, icon, append } = option;

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
          &:focus {
            outline: 2px solid ${euiTheme.colors.primary};
            outline-offset: -2px;
          }
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
        border-radius: 6px;
        transition: background-color 0.2s ease;
        outline: none;
        
        &:hover {
          background-color: ${euiTheme.colors.lightestShade};
        }
        
        &:focus {
          outline: 2px solid ${euiTheme.colors.primary};
          outline-offset: -2px;
        }
        
        ${isSelected && `
          background-color: ${euiTheme.colors.primary};
          color: ${euiTheme.colors.ghost};
          
          &:hover {
            background-color: ${euiTheme.colors.primary};
          }
        `}
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
        {meta && meta.length > 0 && (
          <div
            css={css`
              flex-shrink: 0;
              color: ${isSelected ? euiTheme.colors.ghost : euiTheme.colors.subduedText};
              font-size: ${euiTheme.size.s};
              margin-left: 16px;
            `}
          >
            {meta.map((metaItem, index) => (
              <span key={index}>
                {metaItem.text}
                {index < meta.length - 1 && ' • '}
              </span>
            ))}
          </div>
        )}
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
