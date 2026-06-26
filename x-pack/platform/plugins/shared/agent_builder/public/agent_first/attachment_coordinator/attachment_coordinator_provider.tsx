/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  setAttachWithFlightHandler,
  triggerCartPulse,
  triggerCartReceiving,
  getAgentCartButtonElement,
  getApplicationAttachButtonElement,
  registerAgentCartButtonElement,
  registerApplicationAttachButtonElement,
} from './coordinator_bridge';
import { playFlightAnimation } from './play_flight_animation';
import type { AttachWithFlightOptions } from './types';
import { AgentFirstAttachmentCoordinatorContextProvider } from './use_agent_first_attachment_coordinator';
import { AttachmentHighlightGlobalStyles } from '../attachment_highlight_global_styles';

const waitForNextPaint = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

interface AgentFirstAttachmentCoordinatorProviderProps {
  agentBuilder: AgentBuilderPluginStart;
  children: React.ReactNode;
}

export const AgentFirstAttachmentCoordinatorProvider: React.FC<
  AgentFirstAttachmentCoordinatorProviderProps
> = ({ agentBuilder, children }) => {
  const registerApplicationAttachButton = useCallback((element: HTMLElement | null) => {
    registerApplicationAttachButtonElement(element);
  }, []);

  const registerAgentCartButton = useCallback((element: HTMLElement | null) => {
    registerAgentCartButtonElement(element);
  }, []);

  const pulseCartButton = useCallback(() => {
    triggerCartPulse();
  }, []);

  const attachWithFlight = useCallback(
    async (attachment: AttachmentInput, options?: AttachWithFlightOptions) => {
      const sourceElement = options?.sourceElement ?? getApplicationAttachButtonElement();
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

      triggerCartReceiving(true);

      try {
        await playFlightAnimation({
          fromRect,
          toRect,
          iconType,
        });

        triggerCartReceiving(false);
        await waitForNextPaint();

        agentBuilder.addAttachment(attachment);
        pulseCartButton();
      } catch {
        triggerCartReceiving(false);
      }
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
      <AttachmentHighlightGlobalStyles />
      {children}
    </AgentFirstAttachmentCoordinatorContextProvider>
  );
};
