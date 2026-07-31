/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { htmlIdGenerator } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';

const generateTitleId = htmlIdGenerator('agentBuilderConversationMetadataFlyoutTitle');

export const openConversationMetadataFlyout = async (
  core: CoreStart,
  conversationId: string
): Promise<() => void> => {
  const { ConversationMetadataFlyout } = await import('./conversation_metadata_flyout');
  const titleId = generateTitleId();

  const flyoutRef = core.overlays.openFlyout(
    toMountPoint(
      <ConversationMetadataFlyout conversationId={conversationId} titleId={titleId} />,
      core.rendering
    ),
    {
      size: 's',
      type: 'push',
      'data-test-subj': 'agentBuilderConversationMetadataFlyout',
      'aria-labelledby': titleId,
      onClose: (ref) => ref.close(),
    }
  );

  return () => flyoutRef.close();
};
