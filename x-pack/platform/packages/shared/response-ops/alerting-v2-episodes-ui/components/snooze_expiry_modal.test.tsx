/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { openSnoozeExpiryModal } from './snooze_expiry_modal';

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: (node: unknown) => (element: HTMLElement) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createRoot } = require('react-dom/client');
    const root = createRoot(element);
    root.render(node);
    return () => root.unmount();
  },
}));

jest.mock('@kbn/response-ops-alert-snooze', () => ({
  QuickSnoozePanel: ({
    onScheduleChange,
  }: {
    onScheduleChange: (endDate: string | null | undefined) => void;
  }) => (
    <input
      data-test-subj="quickSnoozeInput"
      onChange={(e) => {
        const raw = (e.target as HTMLInputElement).value;
        onScheduleChange(raw === '' ? undefined : raw);
      }}
    />
  ),
  ConditionalSnoozePanel: ({
    onScheduleChange,
    fieldOptions,
  }: {
    onScheduleChange: (schedule: { conditions?: unknown[] } | undefined) => void;
    fieldOptions?: string[];
  }) => (
    <input
      data-test-subj="conditionalSnoozeInput"
      data-field-options={JSON.stringify(fieldOptions ?? [])}
      onChange={(e) => {
        const raw = (e.target as HTMLInputElement).value;
        onScheduleChange(raw === '' ? undefined : { conditions: [{ type: 'severity_change' }] });
      }}
    />
  ),
}));

const mockOverlays = overlayServiceMock.createStartContract();
const mockRendering = renderingServiceMock.create();

beforeEach(() => {
  jest.clearAllMocks();

  mockOverlays.openModal.mockImplementation((mount: any) => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const unmount = mount(div);
    const close = jest.fn(() => {
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

afterEach(() => {
  // Clean up document.body to remove any modals that might be left over from tests
  document.body.innerHTML = '';
});

describe('openSnoozeExpiryModal', () => {
  it('defaults to the quick tab and resolves { expiresAt } on confirm', async () => {
    const promise = openSnoozeExpiryModal(mockOverlays, mockRendering);

    await waitFor(() => {
      expect(screen.getByTestId('snoozeExpiryModal')).toBeInTheDocument();
    });

    // Quick tab is active by default.
    const input = screen.getByTestId('quickSnoozeInput');
    fireEvent.change(input, { target: { value: '2026-06-01T12:00:00.000Z' } });

    fireEvent.click(screen.getByTestId('snoozeExpiryConfirm'));

    await expect(promise).resolves.toEqual({ expiresAt: '2026-06-01T12:00:00.000Z' });
  });

  it('switches to the conditional tab and resolves the schedule on confirm', async () => {
    const promise = openSnoozeExpiryModal(mockOverlays, mockRendering);

    await waitFor(() => {
      expect(screen.getByTestId('snoozeExpiryModal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('snoozeTab-conditional'));

    fireEvent.change(screen.getByTestId('conditionalSnoozeInput'), {
      target: { value: 'go' },
    });
    fireEvent.click(screen.getByTestId('snoozeExpiryConfirm'));

    await expect(promise).resolves.toEqual({ conditions: [{ type: 'severity_change' }] });
  });

  it('forwards the field options to the conditional snooze panel', async () => {
    openSnoozeExpiryModal(mockOverlays, mockRendering, ['data.host.name', 'data.bytes']);

    await waitFor(() => {
      expect(screen.getByTestId('snoozeExpiryModal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('snoozeTab-conditional'));

    expect(screen.getByTestId('conditionalSnoozeInput')).toHaveAttribute(
      'data-field-options',
      JSON.stringify(['data.host.name', 'data.bytes'])
    );
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

    fireEvent.change(screen.getByTestId('quickSnoozeInput'), {
      target: { value: '2026-06-01T12:00:00.000Z' },
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
