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
 * `tab: 'timeline'` is reserved: the flyout always ignores an entry's `content` for it and
 * only honors its `position`, since Timeline's content is 100% Agent-Builder-owned.
 */
export interface ConversationMetadataTabRegistryEntry {
  tab: string;
  content: (props: { conversation: Conversation }) => React.ReactNode;
  position: number;
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
      position: 1,
      content: ({ conversation }) => (
        <>
          <p>{`Phishing overview for conversation ${conversation.id}.`}</p>
          <ConversationJson value={conversation} />
        </>
      ),
    },
    {
      tab: 'attachments',
      position: 2,
      content: ({ conversation }) => (
        <>
          <p>{`All Attachments: ${conversation.attachments?.length ?? 0}`}</p>
          <ConversationJson value={conversation.attachments} />
        </>
      ),
    },
    {
      // Reserved id — only `position` is honored, `content` here is ignored.
      tab: 'timeline',
      position: 3,
      content: () => null,
    },
  ],
  'insider-threat': [
    {
      tab: 'overview',
      position: 1,
      content: ({ conversation }) => (
        <>
          <p>{`Phishing overview for conversation ${conversation.id}.`}</p>
          <ConversationJson value={conversation} />
        </>
      ),
    },
    {
      tab: 'custom-1',
      position: 2,
      content: ({ conversation }) => (
        <>
          <p>Custom content 1. Full conversation is available</p>
          <ConversationJson value={conversation} />
        </>
      ),
    },
    {
      // Reserved id — only `position` is honored, `content` here is ignored.
      tab: 'timeline',
      position: 3,
      content: () => null,
    },
  ],
  'cloud-security-incident': [
    {
      tab: 'overview',
      position: 1,
      content: ({ conversation }) => (
        <>
          <p>{`Phishing overview for conversation ${conversation.id}.`}</p>
          <ConversationJson value={conversation} />
        </>
      ),
    },
    {
      tab: 'custom-1',
      position: 2,
      content: ({ conversation }) => (
        <>
          <p>Custom content 1. Full conversation is available</p>
          <ConversationJson value={conversation} />
        </>
      ),
    },
    {
      tab: 'custom-2',
      position: 2,
      content: ({ conversation }) => (
        <>
          <p>Custom content 2. Full conversation is available</p>
          <ConversationJson value={conversation} />
        </>
      ),
    },
    {
      tab: 'custom-3',
      position: 2,
      content: ({ conversation }) => (
        <>
          <p>Custom content 3. Full conversation is available</p>
          <ConversationJson value={conversation} />
        </>
      ),
    },
    {
      // Reserved id — only `position` is honored, `content` here is ignored.
      tab: 'timeline',
      position: 3,
      content: () => null,
    },
  ],
};

export const getConversationFlyoutTabs = (
  templateId: string
): ConversationMetadataTabRegistryEntry[] => REGISTRY[templateId] ?? [];
