/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AppNode } from '@kbn/custom-app-common';
import {
  KbnDangerCallout,
  KbnInfoCallout,
  KbnSuccessCallout,
  KbnWarningCallout,
} from '@kbn/ui-callout';
import { StatNode } from './stat_node';

const GUTTER_SIZES = { s: 's', m: 'm', l: 'l' } as const;

const CALLOUTS = {
  primary: KbnInfoCallout,
  success: KbnSuccessCallout,
  warning: KbnWarningCallout,
  danger: KbnDangerCallout,
} as const;

interface NodeRendererProps {
  node: AppNode;
}

/**
 * Renders one document node. The switch is exhaustive over the schema's node types; the default
 * branch is reachable only if a document carries a type this build cannot render, and shows that
 * instead of failing the whole panel.
 */
export const NodeRenderer = ({ node }: NodeRendererProps) => {
  switch (node.type) {
    case 'heading':
      return (
        <EuiTitle size={node.size} data-node-id={node.id}>
          <h3>{node.text}</h3>
        </EuiTitle>
      );
    case 'text':
      return (
        <EuiText size="s" data-node-id={node.id}>
          <p>{node.text}</p>
        </EuiText>
      );
    case 'callout': {
      const Callout = CALLOUTS[node.color];
      return (
        <Callout announceOnMount={false} title={node.title} size="s" data-node-id={node.id}>
          {node.text ? <p>{node.text}</p> : null}
        </Callout>
      );
    }
    case 'stat':
      return <StatNode node={node} />;
    case 'stack':
      return (
        <EuiFlexGroup
          direction={node.direction === 'vertical' ? 'column' : 'row'}
          gutterSize={GUTTER_SIZES[node.gap]}
          responsive={false}
          wrap={node.direction === 'horizontal'}
          data-node-id={node.id}
        >
          {node.children.map((child) => (
            <EuiFlexItem key={child.id} grow={node.direction === 'horizontal'}>
              <NodeRenderer node={child} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      );
    default:
      return <UnsupportedNode node={node} />;
  }
};

const UnsupportedNode = ({ node }: { node: { id?: unknown; type?: unknown } }) => (
  <KbnWarningCallout
    announceOnMount={false}
    size="s"
    title={i18n.translate('xpack.customApp.unsupportedNode.title', {
      defaultMessage: 'This component is not supported',
    })}
    data-node-id={typeof node.id === 'string' ? node.id : undefined}
  >
    <p>
      {i18n.translate('xpack.customApp.unsupportedNode.description', {
        defaultMessage: 'The component type "{type}" is unknown to this version of Kibana.',
        values: { type: String(node.type) },
      })}
    </p>
  </KbnWarningCallout>
);
