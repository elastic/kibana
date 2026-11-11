/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import {
  getBoundSignature,
  interpolate,
  isNodeVisible,
  resolveBoundProps,
  type AppNode,
} from '@kbn/custom-app-common';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useStateValues } from '../runtime/app_runtime_context';
import { getCapabilityView } from '../capabilities/capability_views';

interface NodeRendererProps {
  node: AppNode;
}

/**
 * Renders one document node by asking for the code of its capability. A type that this build cannot
 * draw is shown as that, instead of failing the whole panel.
 */
export const NodeRenderer = ({ node: written }: NodeRendererProps) => {
  const state = useStateValues();
  const text = (value: string) => interpolate(value, state);
  // What is written may read the values of the app, and what is drawn is how they are now. It is the
  // same object until one of those values changes, as what is drawn from it, such as a chart, would
  // otherwise start again every time something else in the app does.
  const resolved = useRef<{ written: AppNode; signature: string; node: AppNode }>();
  const signature = getBoundSignature(written, state);
  if (resolved.current?.written !== written || resolved.current.signature !== signature) {
    resolved.current = { written, signature, node: resolveBoundProps(written, state) };
  }
  const { node } = resolved.current;

  if (!isNodeVisible(node, state)) return null;

  const View = getCapabilityView(node.type);
  if (!View) return <UnsupportedNode node={node} />;
  return (
    <Suspense fallback={null}>
      <View node={node} text={text} />
    </Suspense>
  );
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
