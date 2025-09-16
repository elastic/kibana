/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';

// Function to add custom components to the search list
export const addCustomComponent = (
  component: React.ReactNode,
  setCustomComponents: React.Dispatch<React.SetStateAction<React.ReactNode[]>>
) => {
  setCustomComponents(prev => [...prev, component]);
};

// Function to clear all custom components
export const clearCustomComponents = (
  setCustomComponents: React.Dispatch<React.SetStateAction<React.ReactNode[]>>
) => {
  setCustomComponents([]);
};

// Function to remove a specific custom component by index
export const removeCustomComponent = (
  index: number,
  setCustomComponents: React.Dispatch<React.SetStateAction<React.ReactNode[]>>
) => {
  setCustomComponents(prev => prev.filter((_, i) => i !== index));
};

// Demo custom component factory
export const createDemoCustomComponent = (key: string = 'demo-custom') => {
  return (
    <div
      key={key}
      css={css`
        padding: 12px;
        margin: 4px 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 8px;
        color: white;
        cursor: pointer;
        transition: transform 0.2s ease;
        
        &:hover {
          transform: translateY(-2px);
        }
      `}
      onClick={() => {
        alert('Custom component clicked!');
      }}
    >
      <div css={css`
        display: flex;
        align-items: center;
        gap: 12px;
      `}>
        <EuiIcon type="beaker" size="l" color="ghost" />
        <div>
          <div css={css`font-weight: bold; font-size: 16px;`}>
            🚀 Custom Component Demo
          </div>
          <div css={css`font-size: 14px; opacity: 0.9;`}>
            Click me! You can add any custom content here.
          </div>
        </div>
      </div>
    </div>
  );
};

// Example custom component with different styling
export const createInfoCustomComponent = (title: string, description: string, onClick?: () => void) => {
  return (
    <div
      css={css`
        padding: 12px;
        margin: 4px 0;
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        border-radius: 8px;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
        
        &:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}
      onClick={onClick}
    >
      <div css={css`
        display: flex;
        align-items: center;
        gap: 12px;
      `}>
        <EuiIcon type="iInCircle" size="l" color="ghost" />
        <div>
          <div css={css`font-weight: bold; font-size: 16px;`}>
            {title}
          </div>
          <div css={css`font-size: 14px; opacity: 0.9;`}>
            {description}
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom component with action buttons
export const createActionCustomComponent = (
  title: string, 
  actions: Array<{ label: string; onClick: () => void; icon?: string }>
) => {
  return (
    <div
      css={css`
        padding: 12px;
        margin: 4px 0;
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        border-radius: 8px;
        color: white;
      `}
    >
      <div css={css`
        display: flex;
        justify-content: space-between;
        align-items: center;
      `}>
        <div css={css`font-weight: bold; font-size: 16px;`}>
          {title}
        </div>
        <div css={css`
          display: flex;
          gap: 8px;
        `}>
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              css={css`
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 4px;
                color: white;
                padding: 4px 8px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                
                &:hover {
                  background: rgba(255, 255, 255, 0.3);
                  transform: translateY(-1px);
                }
              `}
            >
              {action.icon && <EuiIcon type={action.icon} size="s" />}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
