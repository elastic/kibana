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
} from '@elastic/eui';
import { DraggableProvided } from '@hello-pangea/dnd';
import { i18n } from '@kbn/i18n';
import { isDescendantOf, isNeverCondition } from '@kbn/streams-schema';
import { css } from '@emotion/css';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { RoutingConditionEditor } from '../condition_editor';
import { ConditionMessage } from '../condition_message';
import { EditRoutingRuleControls } from './control_bars';
import { RoutingDefinitionWithUIAttributes } from './types';

export function RoutingStreamEntry({
  availableStreams,
  draggableProvided,
  isEditing,
  isEditingEnabled,
  onChange,
  onEditIconClick,
  routingRule,
}: {
  availableStreams: string[];
  draggableProvided: DraggableProvided;
  isEditing: boolean;
  isEditingEnabled: boolean;
  onChange: (child: Partial<RoutingDefinitionWithUIAttributes>) => void;
  onEditIconClick: (id: string) => void;
  routingRule: RoutingDefinitionWithUIAttributes;
}) {
  const theme = useEuiTheme();
  const router = useStreamsAppRouter();

  const childrenCount = availableStreams.filter((stream) =>
    isDescendantOf(routingRule.destination, stream)
  ).length;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      color={isNeverCondition(routingRule.if) ? 'transparent' : undefined}
      paddingSize="s"
      className={css`
        overflow: hidden;
        .streamsDragHandle {
          transition: margin-left ${theme.euiTheme.animation.normal};
          padding: ${theme.euiTheme.size.s} 0;
          margin-left: -${theme.euiTheme.size.l};
        }
        &:hover .streamsDragHandle {
          margin-left: 0;
        }
      `}
    >
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
            {...draggableProvided.dragHandleProps}
            aria-label={i18n.translate(
              'xpack.streams.routingStreamEntry.euiPanel.dragHandleLabel',
              { defaultMessage: 'Drag Handle' }
            )}
          >
            <EuiIcon type="grabOmnidirectional" />
          </EuiPanel>
        </EuiFlexItem>
        {isNeverCondition(routingRule.if) && (
          <EuiBadge color="hollow">
            {i18n.translate('xpack.streams.streamDetailRouting.disabled', {
              defaultMessage: 'Disabled',
            })}
          </EuiBadge>
        )}
        <EuiLink
          href={router.link('/{key}/management/{tab}', {
            path: { key: routingRule.destination, tab: 'route' },
          })}
          data-test-subj="streamsAppRoutingStreamEntryButton"
        >
          <EuiText size="s">{routingRule.destination}</EuiText>
        </EuiLink>
        <EuiFlexItem
          className={css`
            overflow: hidden;
          `}
        >
          <EuiText component="p" size="s" color="subdued" className="eui-textTruncate">
            <ConditionMessage condition={routingRule.if} />
          </EuiText>
        </EuiFlexItem>
        {childrenCount > 0 && (
          <EuiBadge color="hollow">
            {i18n.translate('xpack.streams.streamDetailRouting.numberChildren', {
              defaultMessage: '{childrenCount, plural, one {# child} other {# children}}',
              values: { childrenCount },
            })}
          </EuiBadge>
        )}
        <EuiButtonIcon
          data-test-subj="streamsAppRoutingStreamEntryButton"
          iconType="pencil"
          disabled={!isEditingEnabled}
          onClick={() => onEditIconClick(routingRule.id)}
          aria-label={i18n.translate('xpack.streams.streamDetailRouting.edit', {
            defaultMessage: 'Edit',
          })}
        />
      </EuiFlexGroup>
      {isEditing && (
        <EuiFlexGroup direction="column" gutterSize="s">
          <RoutingConditionEditor
            condition={routingRule.if}
            onConditionChange={(condition) => onChange({ if: condition })}
          />
          <EditRoutingRuleControls
            relatedStreams={availableStreams.filter(
              (streamName) =>
                streamName === routingRule.destination ||
                isDescendantOf(routingRule.destination, streamName)
            )}
            routingRule={routingRule}
          />
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
}
