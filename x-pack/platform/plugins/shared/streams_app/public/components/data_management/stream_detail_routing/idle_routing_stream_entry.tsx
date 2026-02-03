/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiBadge,
  EuiButtonIcon,
  useEuiTheme,
  EuiToolTip,
  EuiButtonEmpty,
} from '@elastic/eui';
import type { DraggableProvided } from '@hello-pangea/dnd';
import { i18n } from '@kbn/i18n';
import { isDescendantOf, isRoutingEnabled } from '@kbn/streams-schema';
import { css } from '@emotion/css';
import { css as cssReact } from '@emotion/react';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { ConditionPanel, VerticalRule } from '../shared';
import type { RoutingDefinitionWithUIAttributes } from './types';
import { DisabledBadge } from '../shared';

export function IdleRoutingStreamEntry({
  availableStreams,
  draggableProvided,
  isEditingEnabled,
  onEditClick,
  routingRule,
  canReorder,
}: {
  availableStreams: string[];
  draggableProvided: DraggableProvided;
  isEditingEnabled: boolean;
  onEditClick: (id: string) => void;
  routingRule: RoutingDefinitionWithUIAttributes;
  canReorder: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const router = useStreamsAppRouter();

  const childrenCount = availableStreams.filter((stream) =>
    isDescendantOf(routingRule.destination, stream)
  ).length;

  return (
    <EuiPanel
      color="subdued"
      hasShadow={false}
      hasBorder={false}
      data-test-subj={`routingRule-${routingRule.destination}`}
      className={css`
        overflow: hidden;
        border: ${euiTheme.border.thin};
        .streamsDragHandle {
          transition: margin-left ${euiTheme.animation.normal};
          padding: ${euiTheme.size.s} 0;
          margin-left: -${euiTheme.size.xl};
        }
        &:hover .streamsDragHandle {
          margin-left: 0;
        }
        padding: ${euiTheme.size.m} 16px;
        border-radius: ${euiTheme.size.s};
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexGroup
          justifyContent="flexStart"
          gutterSize="xs"
          alignItems="center"
          responsive={false}
        >
          {canReorder && (
            <EuiFlexItem grow={false}>
              <EuiPanel
                className="streamsDragHandle"
                color="transparent"
                paddingSize="s"
                data-test-subj={`routingRuleDragHandle-${routingRule.destination}`}
                {...draggableProvided.dragHandleProps}
                aria-label={i18n.translate(
                  'xpack.streams.idleRoutingStreamEntry.euiPanel.dragHandleLabel',
                  { defaultMessage: 'Drag Handle' }
                )}
              >
                <EuiIcon type="grabOmnidirectional" />
              </EuiPanel>
            </EuiFlexItem>
          )}

          <EuiLink
            href={router.link('/{key}/management/{tab}', {
              path: { key: routingRule.destination, tab: 'partitioning' },
            })}
            data-test-subj="streamsAppRoutingStreamEntryButton"
            css={cssReact`
              min-width: 0;
            `}
          >
            <EuiText
              size="xs"
              component="p"
              className="eui-textTruncate"
              css={cssReact`
                font-weight: ${euiTheme.font.weight.bold};
              `}
            >
              {routingRule.destination}
            </EuiText>
          </EuiLink>
          <EuiFlexGroup
            justifyContent="flexEnd"
            gutterSize="xs"
            alignItems="center"
            responsive={false}
          >
            {!isRoutingEnabled(routingRule.status) && (
              <>
                <DisabledBadge />
                <VerticalRule />
              </>
            )}
            {childrenCount > 0 && (
              <>
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.streams.streamDetailRouting.numberChildrenTooltip',
                    {
                      defaultMessage: 'Number of child streams',
                    }
                  )}
                >
                  <EuiBadge
                    color="hollow"
                    tabIndex={0}
                    data-test-subj="streamsAppRoutingRuleChildCountBadge"
                  >{`+${childrenCount}`}</EuiBadge>
                </EuiToolTip>
                <VerticalRule />
              </>
            )}
            <EuiButtonIcon
              data-test-subj={`routingRuleEditButton-${routingRule.destination}`}
              iconType="pencil"
              disabled={!isEditingEnabled}
              onClick={() => onEditClick(routingRule.id)}
              aria-label={i18n.translate('xpack.streams.streamDetailRouting.edit', {
                defaultMessage: 'Edit',
              })}
            />
          </EuiFlexGroup>
        </EuiFlexGroup>
        <EuiFlexItem
          grow={false}
          data-test-subj={`streamDetailRoutingItem-${routingRule.destination}`}
          className={css`
            overflow: hidden;
            padding: ${euiTheme.size.xs} 0px;
          `}
        >
          <ConditionPanel
            condition={routingRule.where}
            keywordWrapper={(children) => (
              <EuiToolTip
                position="top"
                content={i18n.translate('xpack.streams.streamDetailRouting.editConditionTooltip', {
                  defaultMessage: 'Edit routing condition',
                })}
              >
                <EuiButtonEmpty
                  onClick={() => onEditClick(routingRule.id)}
                  color="text"
                  size="xs"
                  aria-label={i18n.translate(
                    'xpack.streams.streamsDetailRouting.editConditionLabel',
                    {
                      defaultMessage: 'Edit routing condition',
                    }
                  )}
                  data-test-subj="streamsAppRoutingConditionTitleEditButton"
                >
                  {children}
                </EuiButtonEmpty>
              </EuiToolTip>
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
