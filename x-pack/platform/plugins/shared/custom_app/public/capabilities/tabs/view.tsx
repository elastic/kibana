/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import { TabsFrame, type FrameSection } from '../../components/container_frames';
import { NodeRenderer } from '../../components/node_renderer';
import type { CapabilityViewProps } from '../capability_views';

/** The sections of tabs or an accordion: only a section is drawn, with its title, by what holds it. */
export const toSections = (
  node: AppNodeOfType<'tabs'> | AppNodeOfType<'accordion'>,
  text: (value: string) => string
): FrameSection[] =>
  node.children.flatMap((child) =>
    child.type === 'section'
      ? [
          {
            id: child.id,
            label: text(child.label),
            open: child.open,
            content: child.children.map((inner) => <NodeRenderer key={inner.id} node={inner} />),
          },
        ]
      : []
  );

export const TabsView = ({ node, text }: CapabilityViewProps<AppNodeOfType<'tabs'>>) => (
  <TabsFrame nodeId={node.id} sections={toSections(node, text)} />
);
