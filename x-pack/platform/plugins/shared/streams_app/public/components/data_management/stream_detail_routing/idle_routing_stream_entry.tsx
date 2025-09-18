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
} from '@elastic/eui';
import type { DraggableProvided } from '@hello-pangea/dnd';
import { i18n } from '@kbn/i18n';
import { isDescendantOf, isRoutingEnabled } from '@kbn/streams-schema';
import { css } from '@emotion/css';
import styled from '@emotion/styled';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { ConditionMessage } from '../condition_message';
import type { RoutingDefinitionWithUIAttributes } from './types';

function VerticalRule() {
  const { euiTheme } = useEuiTheme();
  const CentralizedContainer = styled.div`
    display: flex;
    align-items: center;
  `;

  const Border = styled.div`
    height: 20px;
    border-right: ${euiTheme.border.thin};
  `;

  return (
    <CentralizedContainer>
      <Border />
    </CentralizedContainer>
  );
}

export function IdleRoutingStreamEntry({
  availableStreams,
  draggableProvided,
  isEditingEnabled,
  onEditIconClick,
  routingRule,
}: {
  availableStreams: string[];
  draggableProvided: DraggableProvided;
  isEditingEnabled: boolean;
  onEditIconClick: (id: string) => void;
  routingRule: RoutingDefinitionWithUIAttributes;
}) {
  const { euiTheme } = useEuiTheme();
  const router = useStreamsAppRouter();

  const childrenCount = availableStreams.filter((stream) =>
    isDescendantOf(routingRule.destination, stream)
  ).length;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="s"
      data-test-subj={`routingRule-${routingRule.destination}`}
      className={css`
        overflow: hidden;
        .streamsDragHandle {
          transition: margin-left ${euiTheme.animation.normal};
          padding: ${euiTheme.size.s} 0;
          margin-left: -${euiTheme.size.l};
        }
        &:hover .streamsDragHandle {
          margin-left: 0;
        }
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexGroup
          justifyContent="flexStart"
          gutterSize="xs"
          alignItems="center"
          responsive={false}
        >
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
          <EuiLink
            href={router.link('/{key}/management/{tab}', {
              path: { key: routingRule.destination, tab: 'partitioning' },
            })}
            data-test-subj="streamsAppRoutingStreamEntryButton"
          >
            <EuiText size="s">{routingRule.destination}</EuiText>
          </EuiLink>

          <EuiFlexGroup
            justifyContent="flexEnd"
            gutterSize="xs"
            alignItems="center"
            responsive={false}
          >
            {!isRoutingEnabled(routingRule.status) && (
              <>
                <EuiBadge color="subdued">
                  {i18n.translate('xpack.streams.streamDetailRouting.disabled', {
                    defaultMessage: 'Disabled',
                  })}
                </EuiBadge>
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
                  <EuiBadge color="hollow">{`+${childrenCount}`}</EuiBadge>
                </EuiToolTip>
                <VerticalRule />
              </>
            )}
            <EuiButtonIcon
              data-test-subj={`routingRuleEditButton-${routingRule.destination}`}
              iconType="pencil"
              disabled={!isEditingEnabled}
              onClick={() => onEditIconClick(routingRule.id)}
              aria-label={i18n.translate('xpack.streams.streamDetailRouting.edit', {
                defaultMessage: 'Edit',
              })}
            />
          </EuiFlexGroup>
        </EuiFlexGroup>
        <EuiFlexItem
          className={css`
            overflow: hidden;
            padding-left: ${euiTheme.size.s};
          `}
        >
          <EuiText component="p" size="s" color="subdued" className="eui-textTruncate">
            <ConditionMessage condition={routingRule.where} />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
