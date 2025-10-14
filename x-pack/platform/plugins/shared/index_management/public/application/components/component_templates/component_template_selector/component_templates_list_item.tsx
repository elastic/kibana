/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import type { DraggableProvidedDragHandleProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiLink,
  EuiIcon,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import type { ComponentTemplateListItem } from '../../../../../common';
import { TemplateContentIndicator } from '../../shared';

interface Action {
  label: string;
  icon: string;
  handler: (component: ComponentTemplateListItem) => void;
}

const useStyles = ({ isSelected }: { isSelected: boolean }) => {
  const { euiTheme } = useEuiTheme();

  return {
    listItem: css`
      background-color: ${euiTheme.colors.body};
      padding: ${euiTheme.size.m};
      border-bottom: ${euiTheme.border.thin};
      position: relative;
      height: calc(${euiTheme.size.l} * 2);

      ${isSelected &&
      css`
        &::before {
          content: '';
          background-color: rgba(${euiTheme.colors.emptyShade}, 0.7);
          height: 100%;
          left: 0;
          position: absolute;
          top: 0;
          width: 100%;
          z-index: 1;
        }
      `}
    `,
    contentIndicator: css`
      flex-direction: row;
    `,
    checkIcon: css`
      position: absolute;
      right: ${euiTheme.size.base};
      top: ${euiTheme.size.base};
      z-index: 2;
    `,
  };
};

export interface Props {
  component: ComponentTemplateListItem;
  isSelected?: boolean | ((component: ComponentTemplateListItem) => boolean);
  onViewDetail: (component: ComponentTemplateListItem) => void;
  actions?: Action[];
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

export const ComponentTemplatesListItem = ({
  component,
  onViewDetail,
  actions,
  isSelected = false,
  dragHandleProps,
}: Props) => {
  const hasActions = actions && actions.length > 0;
  const isSelectedValue = typeof isSelected === 'function' ? isSelected(component) : isSelected;
  const isDraggable = Boolean(dragHandleProps);
  const styles = useStyles({ isSelected: isSelectedValue });

  return (
    <div css={styles.listItem} data-test-subj="item">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center">
            {isDraggable && (
              <EuiFlexItem>
                <div {...dragHandleProps}>
                  <EuiIcon type="grab" />
                </div>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false} data-test-subj="name">
              {/* <EuiText>{component.name}</EuiText> */}
              <EuiLink onClick={() => onViewDetail(component)}>{component.name}</EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={styles.contentIndicator}>
              <TemplateContentIndicator
                settings={component.hasSettings}
                mappings={component.hasMappings}
                aliases={component.hasAliases}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Actions */}
        {hasActions && !isSelectedValue && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs">
              {actions!.map((action, i) => (
                <EuiFlexItem key={i}>
                  <EuiToolTip content={action.label} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType={action.icon}
                      onClick={() => action.handler(component)}
                      data-test-subj={`action-${action.icon}`}
                      aria-label={action.label}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {/* Check icon when selected */}
      {isSelectedValue && <EuiIcon css={styles.checkIcon} type="check" color="success" />}
    </div>
  );
};
