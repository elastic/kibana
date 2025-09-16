/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
    EuiFlexGroup,
    EuiFlexItem,
    EuiIcon,
    EuiPanel,
    EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import type { ShortcutItem } from './hooks/use_shortcut_menu';

interface ShortcutMenuDropdownProps {
  items: ShortcutItem[];
  selectedIndex: number;
  level: 'main' | 'workflow';
  onSelect: (item: ShortcutItem, index: number) => void;
  position: { top: number; left: number };
}

export const ShortcutMenuDropdown: React.FC<ShortcutMenuDropdownProps> = ({
  items,
  selectedIndex,
  level,
  onSelect,
  position,
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  const dropdownStyles = css`
    position: fixed;
    top: ${position.top}px;
    left: ${position.left}px;
    z-index: 9999;
    min-width: 350px;
    max-width: 450px;
    max-height: 400px;
    overflow-y: auto;
  `;

  const itemStyles = css`
    padding: 12px 16px;
    cursor: pointer;
    border-radius: 6px;
    margin: 4px;
    transition: all 0.15s ease;
    
    &:hover {
      background-color: #f8f9fa;
      transform: translateX(2px);
    }
  `;

  const selectedItemStyles = css`
    padding: 12px 16px;
    cursor: pointer;
    border-radius: 6px;
    margin: 4px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    transform: translateX(2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    
    &:hover {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      transform: translateX(2px);
    }
  `;

  const headerStyles = css`
    padding: 12px 16px;
    border-bottom: 1px solid #e9ecef;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  `;

  const getItemIcon = (item: ShortcutItem) => {
    if (item.icon) return item.icon;
    if (level === 'workflow') return '🔄';
    return '⚡';
  };

  return (
    <EuiPanel css={dropdownStyles} paddingSize="none" hasShadow={true} hasBorder={true}>
      <div css={headerStyles}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={level === 'main' ? 'bolt' : 'gear'} size="s" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              <strong>
                {level === 'main' ? 'Quick Actions' : 'Select Workflow'}
                {level === 'workflow' && (
                  <span style={{ marginLeft: '8px', fontSize: '11px' }}>
                    (← Backspace to go back)
                  </span>
                )}
              </strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      
      {items.map((item, index) => (
        <div
          key={item.id}
          css={index === selectedIndex ? selectedItemStyles : itemStyles}
          onClick={() => onSelect(item, index)}
          data-test-subj={`shortcut-menu-item-${item.id}`}
        >
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <div style={{ fontSize: '20px', lineHeight: 1 }}>
                {getItemIcon(item)}
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
                <EuiFlexItem>
                  <EuiText size="s" color={index === selectedIndex ? 'ghost' : 'default'}>
                    <strong>/{item.label}</strong>
                    {level === 'main' && item.action === 'workflow' && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '11px', 
                        opacity: 0.8,
                        background: index === selectedIndex ? 'rgba(255,255,255,0.2)' : '#e3f2fd',
                        color: index === selectedIndex ? 'white' : '#1565c0',
                        padding: '2px 6px',
                        borderRadius: '3px'
                      }}>
                        Tab to explore →
                      </span>
                    )}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs" color={index === selectedIndex ? 'ghost' : 'subdued'}>
                    {item.description}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      ))}
      
      <div css={headerStyles}>
        <EuiText size="xs" color="subdued" textAlign="center">
          ↑↓ to navigate • Tab to {level === 'main' ? 'explore' : 'select'} • Enter to select • Esc to close
        </EuiText>
      </div>
    </EuiPanel>
  );
};
