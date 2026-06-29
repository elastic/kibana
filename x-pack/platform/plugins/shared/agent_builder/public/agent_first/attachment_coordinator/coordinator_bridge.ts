/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AttachWithFlightOptions } from './types';

declare global {
  interface Window {
    __agentBuilderCartBridgeVersion?: string;
    __agentBuilderCartButtonMounted?: boolean;
    __agentBuilderCartButtonElement?: HTMLElement | null;
  }
}

// POC debug — remove before merge. Set on module load to verify bundle includes latest cart code.
window.__agentBuilderCartBridgeVersion = 'cart-debug-v2';

type AttachWithFlightHandler = (
  attachment: AttachmentInput,
  options?: AttachWithFlightOptions
) => Promise<void>;

type CartPulseListener = () => void;
type CartReceivingListener = (isReceiving: boolean) => void;
type OpenAttachmentCartHandler = (isSidebar: boolean) => void;

let attachWithFlightHandler: AttachWithFlightHandler | null = null;
let openAttachmentCartHandler: OpenAttachmentCartHandler | null = null;
let agentCartButtonElement: HTMLElement | null = null;
let applicationAttachButtonElement: HTMLElement | null = null;
const cartPulseListeners = new Set<CartPulseListener>();
const cartReceivingListeners = new Set<CartReceivingListener>();

export const setAttachWithFlightHandler = (handler: AttachWithFlightHandler | null): void => {
  attachWithFlightHandler = handler;
};

export const registerOpenAttachmentCartHandler = (
  handler: OpenAttachmentCartHandler | null
): void => {
  openAttachmentCartHandler = handler;

  if (handler) {
    // POC debug — remove before merge
    // eslint-disable-next-line no-console
    console.warn('[agentBuilderAttachmentCart] openAttachmentCart handler registered');
  }
};

export const openAttachmentCartFromBridge = (isSidebar: boolean): boolean => {
  if (!openAttachmentCartHandler) {
    // POC debug — remove before merge
    // eslint-disable-next-line no-console
    console.warn('[agentBuilderAttachmentCart] openAttachmentCartFromBridge: no handler registered');
    return false;
  }

  openAttachmentCartHandler(isSidebar);
  return true;
};

export const registerAgentCartButtonElement = (element: HTMLElement | null): void => {
  agentCartButtonElement = element;
  window.__agentBuilderCartButtonMounted = element !== null;
  window.__agentBuilderCartButtonElement = element;

  if (element) {
    // POC debug — remove before merge
    // eslint-disable-next-line no-console
    console.warn('[agentBuilderAttachmentCart] cart button element registered');
  }
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

export const POC_ATTACH_FLIGHT_ICON: IconType = 'pin';
