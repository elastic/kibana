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
import type { DraggableProvided } from '@hello-pangea/dnd';
import { i18n } from '@kbn/i18n';
import { isDescendantOf, isRoutingEnabled } from '@kbn/streams-schema';
import { css } from '@emotion/css';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { RoutingConditionEditor } from '../condition_editor';
import { ConditionMessage } from '../condition_message';
import { EditRoutingRuleControls } from './control_bars';
import type { RoutingDefinitionWithUIAttributes } from './types';

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
      paddingSize="s"
      data-test-subj={`routingRule-${routingRule.destination}`}
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
            data-test-subj={`routingRuleDragHandle-${routingRule.destination}`}
            {...draggableProvided.dragHandleProps}
            aria-label={i18n.translate(
              'xpack.streams.routingStreamEntry.euiPanel.dragHandleLabel',
              { defaultMessage: 'Drag Handle' }
            )}
          >
            <EuiIcon type="grabOmnidirectional" />
          </EuiPanel>
        </EuiFlexItem>
        {!isRoutingEnabled(routingRule.status) && (
          <EuiBadge color="hollow">
            {i18n.translate('xpack.streams.streamDetailRouting.disabled', {
              defaultMessage: 'Disabled',
            })}
          </EuiBadge>
        )}
        <EuiLink
          href={router.link('/{key}/management/{tab}', {
            path: { key: routingRule.destination, tab: 'partitioning' },
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
            <ConditionMessage condition={routingRule.where} />
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
          data-test-subj={`routingRuleEditButton-${routingRule.destination}`}
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
            condition={routingRule.where}
            status={routingRule.status}
            onConditionChange={(cond) => onChange({ where: cond })}
            onStatusChange={(status) => onChange({ status })}
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
