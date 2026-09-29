/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

export const mockFlashMessagesValues = {
  messages: [],
  queuedMessages: [],
};

export const mockFlashMessagesActions = {
  setFlashMessages: vi.fn(),
  clearFlashMessages: vi.fn(),
  setQueuedMessages: vi.fn(),
  clearQueuedMessages: vi.fn(),
  dismissToastMessage: vi.fn(),
};

export const mockFlashMessageHelpers = {
  flashAPIErrors: vi.fn(),
  setSuccessMessage: vi.fn(),
  setErrorMessage: vi.fn(),
  setQueuedSuccessMessage: vi.fn(),
  setQueuedErrorMessage: vi.fn(),
  clearFlashMessages: vi.fn(),
  flashSuccessToast: vi.fn(),
  flashErrorToast: vi.fn(),
  toastAPIErrors: vi.fn(),
};

vi.mock('../components/shared/flash_messages', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...mockFlashMessageHelpers,
  FlashMessagesLogic: {
    values: mockFlashMessagesValues,
    actions: mockFlashMessagesActions,
  },
}));
