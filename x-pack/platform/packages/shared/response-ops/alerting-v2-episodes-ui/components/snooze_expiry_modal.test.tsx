/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { openSnoozeExpiryModal } from './snooze_expiry_modal';

vi.mock('@kbn/react-kibana-mount', () => {
      const mocked = {
      toMountPoint: (node: unknown) => (element: HTMLElement) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createRoot } = require('react-dom/client');
        const root = createRoot(element);
        root.render(node);
        return () => root.unmount();
      },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/response-ops-alert-snooze', () => {
      const mocked = {
      QuickSnoozePanel: ({
        onScheduleChange,
      }: {
        onScheduleChange: (endDate: string | null | undefined) => void;
      }) => (
        <input
          data-test-subj="snoozeFormInput"
          onChange={(e) => {
            const raw = (e.target as HTMLInputElement).value;
            onScheduleChange(raw === '' ? null : raw);
          }}
        />
      ),
    };
      return { ...mocked, default: mocked };
    });

const mockOverlays = overlayServiceMock.createStartContract();
const mockRendering = renderingServiceMock.create();

beforeEach(() => {
  vi.clearAllMocks();

  mockOverlays.openModal.mockImplementation((mount: any) => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const unmount = mount(div);
    const close = vi.fn(() => {
      act(() => {
        if (typeof unmount === 'function') {
          unmount();
        }
        div.remove();
      });
    });
    return { close, onClose: Promise.resolve() } as any;
  });
});

describe('openSnoozeExpiryModal', () => {
  it('resolves with the entered expiry on confirm', async () => {
    const promise = openSnoozeExpiryModal(mockOverlays, mockRendering);

    await waitFor(() => {
      expect(screen.getByTestId('snoozeExpiryModal')).toBeInTheDocument();
    });

    const input = screen.getByTestId('snoozeFormInput'); // data-test-subj="snoozeFormInput" from mock
    fireEvent.change(input, { target: { value: '2026-06-01T12:00:00.000Z' } });

    fireEvent.click(screen.getByTestId('snoozeExpiryConfirm'));

    await expect(promise).resolves.toBe('2026-06-01T12:00:00.000Z');
  });

  it('resolves with undefined on cancel', async () => {
    const promise = openSnoozeExpiryModal(mockOverlays, mockRendering);

    await waitFor(() => {
      expect(screen.getByTestId('snoozeExpiryModal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('snoozeExpiryCancel'));

    await expect(promise).resolves.toBeUndefined();
  });

  it('closes the modal on confirm', async () => {
    openSnoozeExpiryModal(mockOverlays, mockRendering);

    await waitFor(() => {
      expect(screen.getByTestId('snoozeExpiryModal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('snoozeExpiryConfirm'));

    await waitFor(() => {
      expect(screen.queryByTestId('snoozeExpiryModal')).not.toBeInTheDocument();
    });
  });

  it('closes the modal on cancel', async () => {
    openSnoozeExpiryModal(mockOverlays, mockRendering);

    await waitFor(() => {
      expect(screen.getByTestId('snoozeExpiryModal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('snoozeExpiryCancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('snoozeExpiryModal')).not.toBeInTheDocument();
    });
  });
});
