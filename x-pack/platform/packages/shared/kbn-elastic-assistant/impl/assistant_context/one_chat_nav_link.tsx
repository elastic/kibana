/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import { ConversationsNavLink } from '@kbn/onechat-plugin/public';
import { useAssistantContext } from '../..';

export const OneChatNavLink: FC = () => {
  const { showOneChatOverlay, assistantAvailability } = useAssistantContext();

  const showOverlay = useCallback(
    () => showOneChatOverlay({ showOverlay: true }),
    [showOneChatOverlay]
  );

  return (
    <ConversationsNavLink
      onOpenFlyout={showOverlay}
      hasAssistantPrivilege={assistantAvailability.hasAssistantPrivilege}
    />
  );
};
