/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AttachWithFlightOptions } from './types';

type AttachWithFlightHandler = (
  attachment: AttachmentInput,
  options?: AttachWithFlightOptions
) => Promise<void>;

type CartPulseListener = () => void;
type CartReceivingListener = (isReceiving: boolean) => void;

let attachWithFlightHandler: AttachWithFlightHandler | null = null;
let agentCartButtonElement: HTMLElement | null = null;
let applicationAttachButtonElement: HTMLElement | null = null;
const cartPulseListeners = new Set<CartPulseListener>();
const cartReceivingListeners = new Set<CartReceivingListener>();

export const setAttachWithFlightHandler = (handler: AttachWithFlightHandler | null): void => {
  attachWithFlightHandler = handler;
};

export const registerAgentCartButtonElement = (element: HTMLElement | null): void => {
  agentCartButtonElement = element;
};

export const registerApplicationAttachButtonElement = (element: HTMLElement | null): void => {
  applicationAttachButtonElement = element;
};

export const getApplicationAttachButtonElement = (): HTMLElement | null =>
  applicationAttachButtonElement;

export const getAgentCartButtonElement = (): HTMLElement | null =>
  agentCartButtonElement ??
  document.querySelector<HTMLElement>('[data-test-subj="agentBuilderAttachmentCartButton"]');

export const subscribeCartPulse = (listener: CartPulseListener): (() => void) => {
  cartPulseListeners.add(listener);

  return () => {
    cartPulseListeners.delete(listener);
  };
};

export const triggerCartPulse = (): void => {
  cartPulseListeners.forEach((listener) => {
    listener();
  });
};

export const subscribeCartReceiving = (listener: CartReceivingListener): (() => void) => {
  cartReceivingListeners.add(listener);

  return () => {
    cartReceivingListeners.delete(listener);
  };
};

export const triggerCartReceiving = (isReceiving: boolean): void => {
  cartReceivingListeners.forEach((listener) => {
    listener(isReceiving);
  });
};

export const attachWithFlightFromBridge = (
  attachment: AttachmentInput,
  options?: AttachWithFlightOptions
): Promise<void> => {
  if (!attachWithFlightHandler) {
    return Promise.resolve();
  }

  return attachWithFlightHandler(attachment, options);
};

export const POC_ATTACH_ATTACHMENT: AttachmentInput = {
  type: 'group',
  id: 'agent-first-poc-attachment',
  label: 'POC attachment',
  items: [],
};

export const POC_APPLICATION_ATTACH_ATTACHMENT: AttachmentInput = {
  type: 'group',
  id: 'agent-first-poc-application-attachment',
  label: 'POC application attachment',
  items: [],
};

export const POC_ATTACH_FLIGHT_ICON: IconType = 'documents';
