/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { DEFAULT_CONVERSATION_TITLE } from '@kbn/agent-builder-common';
import { downloadFileAs } from '@kbn/share-plugin/public';
import { useConversation, useConversationTitle } from './use_conversation';

/** Downloads the current conversation as a JSON file named after its title. */
export const useDownloadConversation = (): (() => void) => {
  const { conversation } = useConversation();
  const { title } = useConversationTitle();

  return useCallback(() => {
    const slug =
      title
        .replace(/[^\p{L}\p{N}]+/gu, '-') // replace non-alphanumeric chars (unicode-aware) with hyphens
        .replace(/^-|-$/g, '') // strip leading/trailing hyphens
        .toLowerCase() || DEFAULT_CONVERSATION_TITLE;
    downloadFileAs(`${slug}.json`, {
      content: JSON.stringify({ conversation }, null, 2),
      type: 'application/json',
    });
  }, [title, conversation]);
};
