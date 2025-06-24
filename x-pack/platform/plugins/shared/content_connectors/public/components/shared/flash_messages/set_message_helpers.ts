/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLASH_MESSAGE_TYPES } from './constants';
import { FlashMessagesLogic } from './flash_messages_logic';
import { ToastOptions } from './types';

export const setSuccessMessage = (message: string) => {
  FlashMessagesLogic.actions.setFlashMessages({
    type: 'success',
    message,
  });
};

export const setErrorMessage = (message: string) => {
  FlashMessagesLogic.actions.setFlashMessages({
    type: 'error',
    message,
  });
};

export const setQueuedSuccessMessage = (message: string) => {
  FlashMessagesLogic.actions.setQueuedMessages({
    type: 'success',
    message,
  });
};

export const setQueuedErrorMessage = (message: string) => {
  FlashMessagesLogic.actions.setQueuedMessages({
    type: 'error',
    message,
  });
};

export const clearFlashMessages = () => {
  FlashMessagesLogic.actions.clearFlashMessages();
};

export const flashSuccessToast = (message: string, toastOptions: ToastOptions = {}) => {
  FlashMessagesLogic.values.notifications.toasts.add({
    ...FLASH_MESSAGE_TYPES.success,
    ...toastOptions,
    title: message,
  });
};

export const flashErrorToast = (message: string, toastOptions: ToastOptions = {}) => {
  FlashMessagesLogic.values.notifications.toasts.add({
    ...FLASH_MESSAGE_TYPES.error,
    ...toastOptions,
    title: message,
  });
};
