/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import type { EuiFlexItemProps } from '@elastic/eui';
import { css } from '@emotion/react';
import type { A2UISurfaceAttachmentData } from '@kbn/agent-builder-common/attachments';
import type { A2UIComponent } from '@kbn/agent-builder-common/attachments';
import { componentRenderers } from './component_map';
import type { SurfaceActionPayload } from './component_map';
import { SURFACE_ACTION_MARKER } from './surface_action_marker';
import { useSurfaceFormState } from './use_surface_form_state';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { useConversationId } from '../../../context/conversation/use_conversation_id';

const MAX_RENDER_DEPTH = 10;
const VALID_GROW_SIZES: ReadonlySet<number> = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

const CONTENT_SIZED_TYPES: ReadonlySet<string> = new Set(['Icon', 'Badge', 'Button', 'Divider']);

const toFlexGrow = (child: A2UIComponent | undefined): EuiFlexItemProps['grow'] => {
  const { weight, component } = child ?? {};
  if (weight !== undefined && VALID_GROW_SIZES.has(weight)) {
    return weight as EuiFlexItemProps['grow'];
  }
  return component !== undefined && CONTENT_SIZED_TYPES.has(component) ? false : true;
};

interface A2UIRendererProps {
  surface: A2UISurfaceAttachmentData;
}

/**
 * Renders an A2UI surface spec as EUI components.
 *
 * Builds a component tree from the flat adjacency list, starting at the
 * "root" node, and recursively maps each A2UI component type to its
 * EUI equivalent using the component renderer registry.
 */
export const A2UIRenderer: React.FC<A2UIRendererProps> = ({ surface }) => {
  const { euiTheme } = useEuiTheme();
  const { components, data_model: dataModel = {}, surface_id: surfaceId } = surface;
  const { sendMessage } = useSendMessage();
  const conversationId = useConversationId();
  const cacheKey = conversationId ? `${conversationId}::${surfaceId}` : surfaceId;
  const formState = useSurfaceFormState(cacheKey);

  const componentMap = useMemo(() => new Map(components.map((c) => [c.id, c])), [components]);

  const onSurfaceAction = useCallback(
    (payload: SurfaceActionPayload) => {
      const enriched = { ...payload, surfaceId };
      const actionDescription = `[Surface action: ${enriched.action.event.name}]`;
      const hasFormData = Object.keys(enriched.formData).length > 0;
      const formSummary = hasFormData ? `\nForm data: ${JSON.stringify(enriched.formData)}` : '';
      sendMessage({
        message: `${SURFACE_ACTION_MARKER}${actionDescription}${formSummary}`,
      });
    },
    [sendMessage, surfaceId]
  );

  const renderNode = (id: string, depth: number): React.ReactNode => {
    if (depth > MAX_RENDER_DEPTH) {
      return null;
    }

    const comp = componentMap.get(id);
    if (!comp) {
      return null;
    }

    if (comp.visible_when) {
      const currentVal = formState.getFieldValue(comp.visible_when.field);
      const allowed = comp.visible_when.value;
      const matches = Array.isArray(allowed)
        ? allowed.includes(String(currentVal ?? ''))
        : String(currentVal ?? '') === allowed;
      if (!matches) {
        return null;
      }
    }

    const renderer = componentRenderers[comp.component];
    if (!renderer) {
      return null;
    }

    const renderChildren = (childIds: string[]): React.ReactNode =>
      childIds.map((childId) => (
        <EuiFlexItem key={childId} grow={toFlexGrow(componentMap.get(childId))}>
          {renderNode(childId, depth + 1)}
        </EuiFlexItem>
      ));

    const renderChild = (childId: string): React.ReactNode => renderNode(childId, depth + 1);

    return renderer(comp, {
      dataModel,
      renderChildren,
      renderChild,
      onSurfaceAction,
      formState,
    });
  };

  if (!componentMap.has('root')) {
    return (
      <EuiText size="s" color="danger">
        A2UI surface missing root component
      </EuiText>
    );
  }

  return (
    <div
      data-test-subj="a2uiSurface"
      css={css`
        padding: ${euiTheme.size.m};
      `}
    >
      {renderNode('root', 0)}
    </div>
  );
};
