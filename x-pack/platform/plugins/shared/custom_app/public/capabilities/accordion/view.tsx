/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import { AccordionFrame } from '../../components/container_frames';
import type { CapabilityViewProps } from '../capability_views';
import { toSections } from '../tabs/view';

export const AccordionView = ({ node, text }: CapabilityViewProps<AppNodeOfType<'accordion'>>) => (
  <AccordionFrame nodeId={node.id} sections={toSections(node, text)} />
);
