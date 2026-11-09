/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import { useAgentBuilderAvailability } from '../../../../agent_builder/use_agent_builder_availability';

/**
 * Opens the proposal's conversation in Agent Builder's details flyout, as a click on a proposal
 * does in AlertZero. Undefined without Agent Builder or the privilege to open it.
 */
export const useOpenProposalConversation = (): ((conversationId: string) => void) | undefined => {
  const {
    services: { agentBuilder },
  } = useKibana();
  const { hasAgentBuilderPrivilege } = useAgentBuilderAvailability();
  const closeFlyout = useRef<() => void>();
  const isMounted = useRef(true);

  // The flyout outlives the component that opened it, so close it when the case view goes away.
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      closeFlyout.current?.();
      closeFlyout.current = undefined;
    };
  }, []);

  const open = useCallback(
    (conversationId: string) => {
      if (!agentBuilder) {
        return;
      }
      closeFlyout.current?.();
      void agentBuilder.openConversationDetails({ conversationId }).then((close) => {
        // Unmounted before the flyout finished opening: nothing is left to close it later.
        if (!isMounted.current) {
          close();
          return;
        }
        closeFlyout.current = close;
      });
    },
    [agentBuilder]
  );

  return agentBuilder?.openConversationDetails && hasAgentBuilderPrivilege ? open : undefined;
};
