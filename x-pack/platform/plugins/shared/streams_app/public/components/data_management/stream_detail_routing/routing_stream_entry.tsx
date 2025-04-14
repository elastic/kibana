/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { RoutingDefinition, isDescendantOf, isNeverCondition } from '@kbn/streams-schema';
import React from 'react';
import { css } from '@emotion/css';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { RoutingConditionEditor } from '../condition_editor';
import { ConditionMessage } from '../condition_message';
import { ControlBar } from './control_bar';

export function RoutingStreamEntry({
  draggableProvided,
  child,
  onChildChange,
  onEditStateChange,
  edit,
  availableStreams,
  disableEditButton,
}: {
  draggableProvided: DraggableProvided;
  child: RoutingDefinition;
  onChildChange: (child: RoutingDefinition) => void;
  onEditStateChange: () => void;
  edit?: boolean;
  availableStreams: string[];
  disableEditButton?: boolean;
}) {
  const children = availableStreams.filter((stream) =>
    isDescendantOf(child.destination, stream)
  ).length;
  const router = useStreamsAppRouter();
  const theme = useEuiTheme();
  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      color={isNeverCondition(child.if) ? 'transparent' : undefined}
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
      <EuiFlexGroup gutterSize="xs" alignItems="center">
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
        {isNeverCondition(child.if) && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('xpack.streams.streamDetailRouting.disabled', {
                defaultMessage: 'Disabled',
              })}
            </EuiBadge>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiLink
            href={router.link('/{key}/management/{tab}', {
              path: { key: child.destination, tab: 'route' },
            })}
            data-test-subj="streamsAppRoutingStreamEntryButton"
          >
            <EuiText size="s">{child.destination}</EuiText>
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem
          className={css`
            overflow: hidden;
          `}
        >
          <EuiText
            size="s"
            color="subdued"
            className={css`
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            `}
          >
            <ConditionMessage condition={child.if} />
          </EuiText>
        </EuiFlexItem>
        {children > 0 && (
          <EuiBadge color="hollow">
            {i18n.translate('xpack.streams.streamDetailRouting.numberChildren', {
              defaultMessage: '{children, plural, one {# child} other {# children}}',
              values: { children },
            })}
          </EuiBadge>
        )}
        <EuiButtonIcon
          data-test-subj="streamsAppRoutingStreamEntryButton"
          iconType="pencil"
          disabled={disableEditButton}
          onClick={() => {
            onEditStateChange();
          }}
          aria-label={i18n.translate('xpack.streams.streamDetailRouting.edit', {
            defaultMessage: 'Edit',
          })}
        />
      </EuiFlexGroup>
      {edit && (
        <EuiFlexGroup direction="column" gutterSize="s">
          <RoutingConditionEditor
            condition={child.if}
            onConditionChange={(condition) => {
              onChildChange({
                ...child,
                if: condition,
              });
            }}
          />
          <ControlBar />
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
}
