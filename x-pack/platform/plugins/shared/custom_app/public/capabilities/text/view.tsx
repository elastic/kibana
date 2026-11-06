/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiMarkdownFormat } from '@elastic/eui';
import { interpolate, type AppNodeOfType } from '@kbn/custom-app-common';
import { useStateValues } from '../../runtime/app_runtime_context';
import { escapeMarkdownValues } from '../../utils/escape_markdown';
import type { CapabilityViewProps } from '../capability_views';

/**
 * Written in Markdown, so that bold, lists and links look as they are written. The values of the
 * app are put in as plain text: one that came from a link cannot add to the formatting.
 */
export const TextView = ({ node }: CapabilityViewProps<AppNodeOfType<'text'>>) => {
  const state = useStateValues();
  return (
    <div data-node-id={node.id}>
      <EuiMarkdownFormat textSize="s">
        {interpolate(node.text, escapeMarkdownValues(state))}
      </EuiMarkdownFormat>
    </div>
  );
};
