/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import { Column } from '../../components/container_frames';
import { NodeRenderer } from '../../components/node_renderer';
import type { CapabilityViewProps } from '../capability_views';

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
