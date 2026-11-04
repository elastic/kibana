/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import {
  AccordionFrame,
  Column,
  TabsFrame,
  type FrameSection,
} from '../components/container_frames';
import { NodeRenderer } from '../components/node_renderer';
import type { CapabilityViewProps } from './capability_views';

const toSections = (
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

export const AccordionView = ({ node, text }: CapabilityViewProps<AppNodeOfType<'accordion'>>) => (
  <AccordionFrame nodeId={node.id} sections={toSections(node, text)} />
);

/** Only tabs and an accordion draw a section, with its title; on its own it shows what it holds. */
export const SectionView = ({ node }: CapabilityViewProps<AppNodeOfType<'section'>>) => (
  <div data-node-id={node.id}>
    <Column>
      {node.children.map((child) => (
        <NodeRenderer key={child.id} node={child} />
      ))}
    </Column>
  </div>
);
