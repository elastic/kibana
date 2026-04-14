/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem, EuiText } from '@elastic/eui';
import type { A2UISurfaceAttachmentData } from '@kbn/agent-builder-common/attachments';
import { componentRenderers } from './component_map';

const MAX_RENDER_DEPTH = 10;

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
  const { components, data_model: dataModel = {} } = surface;

  const componentMap = useMemo(() => new Map(components.map((c) => [c.id, c])), [components]);

  const renderNode = (id: string, depth: number): React.ReactNode => {
    if (depth > MAX_RENDER_DEPTH) {
      return null;
    }

    const comp = componentMap.get(id);
    if (!comp) {
      return null;
    }

    const renderer = componentRenderers[comp.component];
    if (!renderer) {
      return null;
    }

    const renderChildren = (childIds: string[]): React.ReactNode =>
      childIds.map((childId) => {
        const childComp = componentMap.get(childId);
        const weight = childComp?.weight;
        return (
          <EuiFlexItem key={childId} grow={weight ?? true}>
            {renderNode(childId, depth + 1)}
          </EuiFlexItem>
        );
      });

    const renderChild = (childId: string): React.ReactNode => renderNode(childId, depth + 1);

    return renderer(comp, {
      dataModel,
      renderChildren,
      renderChild,
    });
  };

  if (!componentMap.has('root')) {
    return (
      <EuiText size="s" color="danger">
        A2UI surface missing root component
      </EuiText>
    );
  }

  return <div data-test-subj="a2uiSurface">{renderNode('root', 0)}</div>;
};
