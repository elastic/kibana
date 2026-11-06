/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { QueryClient } from '@kbn/react-query';
import { openSnoozeModal } from './snooze_modal';

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: (node: unknown) => (element: HTMLElement) => {
    const { createRoot } = jest.requireActual('react-dom/client');
    const root = createRoot(element);
    root.render(node);
    return () => root.unmount();
  },
}));

jest.mock('@kbn/response-ops-alert-snooze', () => {
  const actual = jest.requireActual('@kbn/response-ops-alert-snooze');
  return {
    ...actual,
    SnoozeFormBody: ({
      activeTab,
      onTabChange,
      onQuickScheduleChange,
      onConditionalScheduleChange,
      fieldOptions,
      conditionalTabDisabledReason,
    }: {
      activeTab: string;
      onTabChange: (tab: string) => void;
      onQuickScheduleChange: (endDate: string | null | undefined) => void;
      onConditionalScheduleChange: (schedule: unknown) => void;
      fieldOptions?: string[];
      conditionalTabDisabledReason?: string;
    }) => (
      <div data-test-subj="snoozeFormBody" data-active-tab={activeTab}>
        <div data-test-subj="snoozeFieldOptions">{(fieldOptions ?? []).join(',')}</div>
        <div data-test-subj="snoozeConditionalDisabledReason">
          {conditionalTabDisabledReason ?? ''}
        </div>
        <button data-test-subj="selectConditionalTab" onClick={() => onTabChange('conditional')}>
          {'conditional'}
        </button>
        <input
          data-test-subj="snoozeQuickInput"
          onChange={(e) => onQuickScheduleChange((e.target as HTMLInputElement).value)}
        />
        <button data-test-subj="setQuickIndefinite" onClick={() => onQuickScheduleChange(null)}>
          {'indefinitely'}
        </button>
        <button
          data-test-subj="setConditionalSchedule"
          onClick={() =>
            onConditionalScheduleChange({
              conditions: [{ type: 'severity_change' }],
              conditionOperator: 'all',
            })
          }
        >
          {'set conditions'}
        </button>
      </div>
    ),
  };
});

const mockHttp = httpServiceMock.createStartContract();
const mockOverlays = overlayServiceMock.createStartContract();
const mockRendering = renderingServiceMock.create();

const makeDeps = () => ({
  http: mockHttp,
  overlays: mockOverlays,
  rendering: mockRendering,
  queryClient: new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
});

// Tests that never confirm or cancel leave the modal mounted.
let openModals: Array<() => void> = [];

beforeEach(() => {
  jest.clearAllMocks();
  openModals = [];

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
    openModals.push(close);
    return { close, onClose: Promise.resolve() } as any;
  });
});

afterEach(() => {
  openModals.forEach((close) => close());
  openModals = [];
});

describe('openSnoozeModal', () => {
  it('resolves with the entered expiry on confirm', async () => {
    const promise = openSnoozeModal(makeDeps());

    await waitFor(() => {
      expect(screen.getByTestId('snoozeModal')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('snoozeQuickInput'), {
      target: { value: '2026-06-01T12:00:00.000Z' },
    });
    fireEvent.click(screen.getByTestId('snoozeModalConfirm'));

    await expect(promise).resolves.toEqual({ snoozedUntil: '2026-06-01T12:00:00.000Z' });
  });

  it('resolves with an indefinite snooze when no expiry is picked', async () => {
    const promise = openSnoozeModal(makeDeps());

    await waitFor(() => {
      expect(screen.getByTestId('snoozeModal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('setQuickIndefinite'));
    fireEvent.click(screen.getByTestId('snoozeModalConfirm'));

    await expect(promise).resolves.toEqual({ snoozedUntil: null });
  });

  it('resolves with the conditions from the conditional tab', async () => {
    const promise = openSnoozeModal(makeDeps());

    await waitFor(() => {
      expect(screen.getByTestId('snoozeModal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('selectConditionalTab'));
    fireEvent.click(screen.getByTestId('setConditionalSchedule'));
    fireEvent.click(screen.getByTestId('snoozeModalConfirm'));

    await expect(promise).resolves.toEqual({
      snoozedUntil: null,
      conditions: [{ type: 'severity_change' }],
      conditionOperator: 'all',
    });
  });

  it('disables confirm until the active tab has something to apply', async () => {
    openSnoozeModal(makeDeps());

    await waitFor(() => {
      expect(screen.getByTestId('snoozeModal')).toBeInTheDocument();
    });

    expect(screen.getByTestId('snoozeModalConfirm')).toBeDisabled();

    fireEvent.change(screen.getByTestId('snoozeQuickInput'), {
      target: { value: '2026-06-01T12:00:00.000Z' },
    });

    expect(screen.getByTestId('snoozeModalConfirm')).toBeEnabled();
  });

  it('resolves with undefined on cancel', async () => {
    const promise = openSnoozeModal(makeDeps());

    await waitFor(() => {
      expect(screen.getByTestId('snoozeModal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('snoozeModalCancel'));

    await expect(promise).resolves.toBeUndefined();
  });

  it('closes the modal on confirm', async () => {
    openSnoozeModal(makeDeps());

    await waitFor(() => {
      expect(screen.getByTestId('snoozeModal')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('snoozeQuickInput'), {
      target: { value: '2026-06-01T12:00:00.000Z' },
    });
    fireEvent.click(screen.getByTestId('snoozeModalConfirm'));

    await waitFor(() => {
      expect(screen.queryByTestId('snoozeModal')).not.toBeInTheDocument();
    });
  });

  it('closes the modal on cancel', async () => {
    openSnoozeModal(makeDeps());

    await waitFor(() => {
      expect(screen.getByTestId('snoozeModal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('snoozeModalCancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('snoozeModal')).not.toBeInTheDocument();
    });
  });

  it('forwards the disabled reason to the form body', async () => {
    openSnoozeModal(makeDeps(), { conditionalTabDisabledReason: 'Not supported' });

    await waitFor(() => {
      expect(screen.getByTestId('snoozeConditionalDisabledReason')).toHaveTextContent(
        'Not supported'
      );
    });
  });

  it("loads the field_change options from the data source's searchable fields", async () => {
    const fetchSearchFields = jest.fn().mockResolvedValue([
      {
        name: 'host.name',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
      },
      {
        name: 'kibana.alert.grouping',
        type: 'object',
        esTypes: ['object'],
        searchable: false,
        aggregatable: false,
      },
    ]);

    openSnoozeModal(makeDeps(), { dataSource: { id: 'classic-alerts', fetchSearchFields } });

    await waitFor(() => {
      expect(screen.getByTestId('snoozeFieldOptions')).toHaveTextContent('host.name');
    });
    expect(screen.getByTestId('snoozeFieldOptions')).not.toHaveTextContent('kibana.alert.grouping');
  });

  it('skips the field lookup when conditions are unavailable', async () => {
    const fetchSearchFields = jest.fn().mockResolvedValue([]);

    openSnoozeModal(makeDeps(), {
      dataSource: { id: 'classic-alerts', fetchSearchFields },
      conditionalTabDisabledReason: 'Not supported',
    });

    await waitFor(() => {
      expect(screen.getByTestId('snoozeModal')).toBeInTheDocument();
    });

    expect(fetchSearchFields).not.toHaveBeenCalled();
  });

  it('scopes the field lookup to the rule types of the rows being snoozed', async () => {
    const fetchSearchFields = jest.fn().mockResolvedValue([]);

    openSnoozeModal(makeDeps(), {
      dataSource: { id: 'classic-alerts', fetchSearchFields },
      ruleTypeIds: ['observability.rules.custom_threshold'],
    });

    await waitFor(() => {
      expect(fetchSearchFields).toHaveBeenCalledWith(
        expect.objectContaining({ ruleTypeIds: ['observability.rules.custom_threshold'] })
      );
    });
  });
});
