/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { act, within } from '@testing-library/react';
import type { MountPoint, ToastInputFields } from '@kbn/core/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ErrorDetailsServices } from '../components/error_details';

/** Core's services that error toasts use, with what each was asked to show. */
export const createErrorToastServices = () => {
  const toast = { id: 'toast' };
  const close = jest.fn();
  const services = {
    notifications: {
      toasts: {
        addSuccess: jest.fn(),
        addDanger: jest.fn(() => toast),
        remove: jest.fn(),
      },
    },
    overlays: { openModal: jest.fn(() => ({ close })) },
    rendering: {
      addContext: (node: ReactNode) => <IntlProvider locale="en">{node}</IntlProvider>,
    },
    uiSettings: { get: jest.fn(() => 300000) },
  };
  return { services: services as unknown as ErrorDetailsServices, ...services, toast, close };
};

/** Renders a toast's or modal's content the way Kibana mounts it. */
export const mountContent = (mountPoint: MountPoint) => {
  const element = document.createElement('div');
  document.body.appendChild(element);
  act(() => {
    mountPoint(element);
  });
  return within(element);
};

/** The last danger toast, and the content of the details modal its action opens. */
export const openErrorDetails = (mocks: ReturnType<typeof createErrorToastServices>) => {
  const { addDanger } = mocks.notifications.toasts;
  const [toastInput] = addDanger.mock.calls[addDanger.mock.calls.length - 1] as unknown as [
    ToastInputFields & { text?: string }
  ];
  // The toasts' action ignores its event.
  const openDetails = toastInput.actionProps?.primary?.onClick as (() => void) | undefined;
  act(() => openDetails?.());
  const { openModal } = mocks.overlays;
  const [modalMount, options] = openModal.mock.calls[
    openModal.mock.calls.length - 1
  ] as unknown as [MountPoint, { 'aria-labelledby': string }];
  return { toastInput, modal: mountContent(modalMount), options };
};
