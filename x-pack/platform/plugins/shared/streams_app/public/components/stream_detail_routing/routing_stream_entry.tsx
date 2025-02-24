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
} from '@elastic/eui';
import { DraggableProvided } from '@hello-pangea/dnd';
import { i18n } from '@kbn/i18n';
import { RoutingDefinition, isDescendantOf } from '@kbn/streams-schema';
import React from 'react';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { alwaysToEmptyEquals } from '../../util/condition';
import { ConditionEditor } from '../condition_editor';

export function RoutingStreamEntry({
  draggableProvided,
  child,
  onChildChange,
  onEditStateChange,
  edit,
  availableStreams,
}: {
  draggableProvided: DraggableProvided;
  child: RoutingDefinition;
  onChildChange: (child: RoutingDefinition) => void;
  onEditStateChange: () => void;
  edit?: boolean;
  availableStreams: string[];
}) {
  const children = availableStreams.filter((stream) =>
    isDescendantOf(child.destination, stream)
  ).length;
  const router = useStreamsAppRouter();
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="s">
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow>
          <EuiFlexGroup gutterSize="none" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiPanel
                color="transparent"
                paddingSize="s"
                {...draggableProvided.dragHandleProps}
                aria-label={i18n.translate(
                  'xpack.streams.routingStreamEntry.euiPanel.dragHandleLabel',
                  { defaultMessage: 'Drag Handle' }
                )}
              >
                <EuiIcon type="grab" />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiLink
                href={router.link('/{key}/{tab}/{subtab}', {
                  path: { key: child.destination, tab: 'management', subtab: 'route' },
                })}
                data-test-subj="streamsAppRoutingStreamEntryButton"
              >
                <EuiText size="s">{child.destination}</EuiText>
              </EuiLink>
              {children > 0 && (
                <EuiBadge color="hollow">
                  {i18n.translate('xpack.streams.streamDetailRouting.numberChildren', {
                    defaultMessage: '{children, plural, one {# child} other {# children}}',
                    values: { children },
                  })}
                </EuiBadge>
              )}
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiButtonIcon
          data-test-subj="streamsAppRoutingStreamEntryButton"
          iconType="pencil"
          onClick={() => {
            onEditStateChange();
          }}
          aria-label={i18n.translate('xpack.streams.streamDetailRouting.edit', {
            defaultMessage: 'Edit',
          })}
        />
      </EuiFlexGroup>
      <ConditionEditor
        readonly={!edit}
        condition={alwaysToEmptyEquals(child.if)}
        onConditionChange={(condition) => {
          onChildChange({
            ...child,
            if: condition,
          });
        }}
      />
    </EuiPanel>
  );
}
