/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import type { OpenChatOptions } from '../../types';
import { useKibana } from './use_kibana';

/**
 * Resolves the Agent Builder chat opener that a downstream plugin
 * (`agent_builder_platform`) registers at start. Context Engine cannot depend on
 * Agent Builder directly (dependency cycle), so it opens chat through this
 * registered function. `isAvailable` is false when no opener is registered or the
 * user lacks the Agent Builder capability.
 */
export const useChatOpener = () => {
  const {
    services: { getChatOpener, application },
  } = useKibana();

  const opener = getChatOpener?.();
  const capability = Boolean(application.capabilities?.agentBuilder?.show);
  // Agent Builder is always enabled in supported deployments, so we gate only on the
  // chat opener being registered (by agent_builder_platform), not on the capability flag.
  const isAvailable = Boolean(opener);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.info(
      '[ce:chat-bridge] useChatOpener resolve —',
      'getChatOpener wired:', Boolean(getChatOpener),
      '| opener registered:', Boolean(opener),
      '| agentBuilder.show capability:', capability,
      '| isAvailable:', isAvailable
    );
  }, [getChatOpener, opener, capability, isAvailable]);

  const openChat = useCallback(
    (options: OpenChatOptions) => {
      opener?.(options);
    },
    [opener]
  );

  return { openChat, isAvailable };
};
