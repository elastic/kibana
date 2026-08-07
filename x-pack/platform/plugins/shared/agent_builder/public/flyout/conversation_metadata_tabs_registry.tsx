/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import type { Conversation } from '@kbn/agent-builder-common';

/**
 * Minimal internal lookup for per-template conversation metadata flyout tabs.
 *
 * Not exposed on any public contract yet — this is deliberately just a lookup function,
 * not a registration API other plugins can call. It exists so the flyout's tab-merging
 * logic can be built and tested now, and swapped for a real cross-plugin registry later
 * without the flyout itself needing to change.
 *
 * Entries render in the order listed here. `tab: 'timeline'` is reserved — the flyout
 * always ignores an entry targeting it and appends its own fixed Timeline tab last.
 */
export interface ConversationMetadataTabRegistryEntry {
  tab: string;
  content: (props: { conversation: Conversation }) => React.ReactNode;
}

const ConversationJson: React.FC<{ value: unknown }> = ({ value }) => (
  <EuiCodeBlock language="json" fontSize="s" paddingSize="s" whiteSpace="pre-wrap">
    {JSON.stringify(value, null, 2)}
  </EuiCodeBlock>
);

const REGISTRY: Record<string, ConversationMetadataTabRegistryEntry[]> = {
  'endpoint-compromise': [
    {
      tab: 'overview',
      content: ({ conversation }) => (
        <>
          <ConversationJson value={conversation} />
        </>
      ),
    },
  ],
  'insider-threat': [
    {
      tab: 'overview',
      content: ({ conversation }) => (
        <>
          <ConversationJson value={conversation} />
        </>
      ),
    },
    {
      tab: 'custom-1',
      content: ({ conversation }) => (
        <>
          <p>Custom content 1. Full conversation is available</p>
          <ConversationJson value={conversation} />
        </>
      ),
    },
  ],
  'cloud-security-incident': [
    {
      tab: 'overview',
      content: ({ conversation }) => (
        <>
          <ConversationJson value={conversation} />
        </>
      ),
    },
    {
      tab: 'custom-1',
      content: ({ conversation }) => (
        <>
          <p>Custom content 1. Full conversation is available</p>
          <ConversationJson value={conversation} />
        </>
      ),
    },
  ],
};

export const getConversationFlyoutTabs = (
  templateId: string
): ConversationMetadataTabRegistryEntry[] => REGISTRY[templateId] ?? [];
