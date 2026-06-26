/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { setAttachWithFlightHandler, triggerCartPulse, getAgentCartButtonElement, registerAgentCartButtonElement } from './coordinator_bridge';
import { playFlightAnimation } from './play_flight_animation';
import type { AttachWithFlightOptions } from './types';
import { AgentFirstAttachmentCoordinatorContextProvider } from './use_agent_first_attachment_coordinator';

interface AgentFirstAttachmentCoordinatorProviderProps {
  agentBuilder: AgentBuilderPluginStart;
  children: React.ReactNode;
}

export const AgentFirstAttachmentCoordinatorProvider: React.FC<
  AgentFirstAttachmentCoordinatorProviderProps
> = ({ agentBuilder, children }) => {
  const applicationAttachButtonRef = useRef<HTMLElement | null>(null);

  const registerApplicationAttachButton = useCallback((element: HTMLElement | null) => {
    applicationAttachButtonRef.current = element;
  }, []);

  const registerAgentCartButton = useCallback((element: HTMLElement | null) => {
    registerAgentCartButtonElement(element);
  }, []);

  const pulseCartButton = useCallback(() => {
    triggerCartPulse();
  }, []);

  const attachWithFlight = useCallback(
    async (attachment: AttachmentInput, options?: AttachWithFlightOptions) => {
      const sourceElement = options?.sourceElement ?? applicationAttachButtonRef.current;
      const targetElement = getAgentCartButtonElement();
      const iconType = options?.iconType ?? 'paperClip';

      const fromRect =
        options?.sourceRect ??
        (sourceElement ? sourceElement.getBoundingClientRect() : undefined);
      const toRect = targetElement?.getBoundingClientRect();

      if (!fromRect || !toRect || (fromRect.width === 0 && fromRect.height === 0)) {
        agentBuilder.addAttachment(attachment);
        pulseCartButton();
        return;
      }

      await playFlightAnimation({
        fromRect,
        toRect,
        iconType,
      });

      agentBuilder.addAttachment(attachment);
      pulseCartButton();
    },
    [agentBuilder, pulseCartButton]
  );

  useEffect(() => {
    setAttachWithFlightHandler(attachWithFlight);

    return () => {
      setAttachWithFlightHandler(null);
    };
  }, [attachWithFlight]);

  const value = useMemo(
    () => ({
      registerApplicationAttachButton,
      registerAgentCartButton,
      attachWithFlight,
    }),
    [attachWithFlight, registerAgentCartButton, registerApplicationAttachButton]
  );

  return (
    <AgentFirstAttachmentCoordinatorContextProvider value={value}>
      {children}
    </AgentFirstAttachmentCoordinatorContextProvider>
  );
};
