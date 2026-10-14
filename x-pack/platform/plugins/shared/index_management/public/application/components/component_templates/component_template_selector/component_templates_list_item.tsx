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
  EuiButtonEmpty,
  EuiIcon,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import type { ComponentTemplateListItem } from '../../../../../common';
import { TemplateContentIndicator } from '../../shared';

const frozenOrDeletePhaseDisabledTooltip = i18n.translate(
  'xpack.idxMgmt.componentTemplatesListItem.frozenOrDeletePhaseDisabledTooltip',
  {
    defaultMessage:
      'This component template is only compatible with index templates that create a data stream.',
  }
);

interface Action {
  label: string;
  icon: string;
  handler: (component: ComponentTemplateListItem) => void;
}

const useStyles = ({ isSelected }: { isSelected: boolean }) => {
  const { euiTheme } = useEuiTheme();

  return {
    listItem: css`
      width: 100%;
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
          z-index: ${Number(euiTheme.levels.content) + 1};
        }
      `}
    `,
    nameButton: css`
      block-size: auto;
      min-block-size: 0;
      line-height: ${euiTheme.font.lineHeightMultiplier};
    `,
    contentIndicator: css`
      flex-direction: row;
    `,
    checkIcon: css`
      position: absolute;
      right: ${euiTheme.size.base};
      top: ${euiTheme.size.base};
      z-index: ${Number(euiTheme.levels.content) + 2};
    `,
  };
};

export interface Props {
  component: ComponentTemplateListItem;
  isSelected?: boolean | ((component: ComponentTemplateListItem) => boolean);
  onViewDetail: (component: ComponentTemplateListItem) => void;
  actions?: Action[];
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  createsDataStream?: boolean;
}

export const ComponentTemplatesListItem = ({
  component,
  onViewDetail,
  actions,
  isSelected = false,
  dragHandleProps,
  createsDataStream = true,
}: Props) => {
  const hasActions = actions && actions.length > 0;
  const isSelectedValue = typeof isSelected === 'function' ? isSelected(component) : isSelected;
  const isDraggable = Boolean(dragHandleProps);
  const canBeSelected = createsDataStream || !component.hasFrozenOrDeletePhase;
  const isDisabled = !canBeSelected || isSelectedValue;
  const styles = useStyles({ isSelected: isSelectedValue });

  const itemContent = (
    <div css={styles.listItem} data-test-subj="item">
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center">
            {isDraggable && (
              <EuiFlexItem>
                <div {...dragHandleProps}>
                  <EuiIcon type="dragVertical" aria-hidden={true} />
                </div>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false} data-test-subj="name">
              <EuiButtonEmpty
                flush="both"
                color="primary"
                size="s"
                css={styles.nameButton}
                onClick={() => onViewDetail(component)}
                disabled={isDisabled}
              >
                {component.name}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={styles.contentIndicator}>
              <TemplateContentIndicator
                settings={component.hasSettings}
                mappings={component.hasMappings}
                aliases={component.hasAliases}
                isDisabled={isDisabled}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Actions */}
        {hasActions && !isSelectedValue && canBeSelected && (
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
      {isSelectedValue && (
        <EuiIcon css={styles.checkIcon} type="check" color="success" aria-hidden={true} />
      )}
    </div>
  );

  if (!canBeSelected) {
    return (
      <EuiToolTip
        content={frozenOrDeletePhaseDisabledTooltip}
        position="left"
        anchorProps={{
          css: css({ display: 'block' }),
          'data-test-subj': 'disabledReasonTooltip',
        }}
      >
        {itemContent}
      </EuiToolTip>
    );
  }

  return itemContent;
};
