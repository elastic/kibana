/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';

import { renderWithTestingProviders } from '../../common/mock';
import { EditObservableModal, type EditObservableModalProps } from './edit_observable_modal';
import { mockCase } from '../../containers/mock';
import { SEARCH_DEBOUNCE_MS } from '../../../common/constants';
import { getObservableMetadata, patchObservable } from '../../containers/api';

jest.mock('../../containers/api');

describe('EditObservableModal', () => {
  const props: EditObservableModalProps = {
    onCloseModal: jest.fn(),
    caseData: mockCase,
    observable: {
      value: 'test',
      typeKey: '67ac7899-2cc0-4ce5-80d3-0f4a2d2af33e',
      id: '84279197-3746-47fb-ba4d-c7946a7feb88',
      createdAt: '2024-10-01',
      updatedAt: '2024-10-01',
      description: '',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(patchObservable).mockResolvedValue(mockCase);
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(<EditObservableModal {...props} />);

    expect(screen.getByTestId('case-observables-edit-modal')).toBeInTheDocument();
    expect(screen.getByText('Save observable')).toBeInTheDocument();
  });

  it('calls handleUpdateObservable', async () => {
    renderWithTestingProviders(<EditObservableModal {...props} />);

    expect(screen.getByText('Save observable')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Save observable'));

    expect(patchObservable).toHaveBeenCalled();
  });

  it('spins on save and closes once the update is saved', async () => {
    let resolvePatch: (theCase: typeof mockCase) => void = () => {};
    jest.mocked(patchObservable).mockReturnValue(
      new Promise((resolve) => {
        resolvePatch = resolve;
      })
    );
    const onObservableUpdated = jest.fn();
    renderWithTestingProviders(
      <EditObservableModal {...props} onObservableUpdated={onObservableUpdated} />
    );

    await userEvent.click(screen.getByText('Save observable'));

    await waitFor(() => expect(screen.getByTestId('save-observable')).toBeDisabled());
    expect(props.onCloseModal).not.toHaveBeenCalled();
    expect(onObservableUpdated).not.toHaveBeenCalled();

    resolvePatch(mockCase);

    await waitFor(() => expect(props.onCloseModal).toHaveBeenCalled());
    expect(onObservableUpdated).toHaveBeenCalledWith(expect.objectContaining({ value: 'test' }));
  });

  it('stays open when the update fails', async () => {
    jest.mocked(patchObservable).mockRejectedValue(new Error('conflict'));
    const onObservableUpdated = jest.fn();
    renderWithTestingProviders(
      <EditObservableModal {...props} onObservableUpdated={onObservableUpdated} />
    );

    await userEvent.click(screen.getByText('Save observable'));

    await waitFor(() => expect(screen.getByTestId('save-observable')).toBeEnabled());
    expect(patchObservable).toHaveBeenCalled();
    expect(props.onCloseModal).not.toHaveBeenCalled();
    expect(onObservableUpdated).not.toHaveBeenCalled();
    expect(screen.getByTestId('case-observables-edit-modal')).toBeInTheDocument();
  });

  it('leaves the metadata out when the user did not change it', async () => {
    renderWithTestingProviders(
      <EditObservableModal
        {...props}
        observable={{ ...props.observable, metadata: { triage: 'confirmed' } }}
      />
    );

    await userEvent.click(screen.getByText('Save observable'));

    await waitFor(() => expect(patchObservable).toHaveBeenCalled());
    const [[{ observable }]] = jest.mocked(patchObservable).mock.calls;
    expect(observable).not.toHaveProperty('metadata');
  });

  it('shows the stored metadata and clears it when every pair is removed', async () => {
    renderWithTestingProviders(
      <EditObservableModal
        {...props}
        observable={{ ...props.observable, metadata: { triage: 'confirmed' } }}
      />
    );

    expect(screen.getByTestId('observable-metadata-key')).toHaveValue('triage');
    expect(screen.getByTestId('observable-metadata-value')).toHaveValue('confirmed');

    await userEvent.click(screen.getByTestId('observable-metadata-remove'));
    await userEvent.click(screen.getByText('Save observable'));

    await waitFor(() => expect(patchObservable).toHaveBeenCalled());
    const [[{ observable }]] = jest.mocked(patchObservable).mock.calls;
    expect(observable.metadata).toEqual({});
  });

  describe('when the value changes', () => {
    let user: ReturnType<typeof userEvent.setup>;
    const editedObservable = { ...props.observable, metadata: { triage: 'confirmed' } };
    const sharedMetadata = { owner: 'team-a', triage: 'benign' };

    // Runs the timers React Query notifies its observers with.
    const flushQueries = () => act(() => jest.runOnlyPendingTimersAsync());

    // Types the value, then lets the debounce and the metadata request settle.
    const changeValue = async (value: string) => {
      await user.clear(screen.getByTestId('observable-value-field'));
      await user.type(screen.getByTestId('observable-value-field'), value);
      await act(() => jest.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));
      await flushQueries();
    };

    // The form submits after its async validation, so the click and the save settle inside act.
    const save = async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('Save observable'));
        await jest.runOnlyPendingTimersAsync();
      });
      await flushQueries();
    };

    const inputValues = (testId: string) =>
      screen.getAllByTestId(testId).map((input) => (input as HTMLInputElement).value);

    const savedObservable = () => {
      const [[{ observable }]] = jest.mocked(patchObservable).mock.calls;
      return observable;
    };

    beforeEach(() => {
      jest.useFakeTimers();
      user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      jest.mocked(getObservableMetadata).mockResolvedValue({ metadata: sharedMetadata });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('loads the metadata the new value holds into the rows', async () => {
      renderWithTestingProviders(<EditObservableModal {...props} observable={editedObservable} />);

      await changeValue('shared');

      expect(inputValues('observable-metadata-key')).toEqual(['owner', 'triage']);
      expect(inputValues('observable-metadata-value')).toEqual(['team-a', 'benign']);
      expect(getObservableMetadata).toHaveBeenCalledTimes(1);
      expect(getObservableMetadata).toHaveBeenCalledWith(
        mockCase.id,
        { typeKey: props.observable.typeKey, value: 'shared' },
        expect.any(AbortSignal)
      );
    });

    it('keeps the metadata of the new value when a pair is added to it', async () => {
      renderWithTestingProviders(<EditObservableModal {...props} observable={editedObservable} />);

      await changeValue('shared');

      await user.click(screen.getByTestId('observable-metadata-add'));
      await user.type(screen.getAllByTestId('observable-metadata-key')[2], 'status');
      await user.type(screen.getAllByTestId('observable-metadata-value')[2], 'open');
      await save();

      expect(savedObservable()).toEqual(
        expect.objectContaining({
          value: 'shared',
          metadata: { owner: 'team-a', triage: 'benign', status: 'open' },
        })
      );
    });

    it('leaves the metadata out when the rows of the new value are not changed', async () => {
      renderWithTestingProviders(<EditObservableModal {...props} observable={editedObservable} />);

      await changeValue('shared');
      await save();

      expect(savedObservable().value).toBe('shared');
      expect(savedObservable()).not.toHaveProperty('metadata');
    });

    it('shows no rows for a value that holds no metadata', async () => {
      jest.mocked(getObservableMetadata).mockResolvedValue({ metadata: {} });
      renderWithTestingProviders(<EditObservableModal {...props} observable={editedObservable} />);

      await changeValue('new-value');

      expect(screen.queryByTestId('observable-metadata-key')).not.toBeInTheDocument();
    });

    it('disables saving until the metadata of the new value loads', async () => {
      let resolveMetadata: (response: { metadata: Record<string, string> }) => void = () => {};
      jest.mocked(getObservableMetadata).mockReturnValue(
        new Promise((resolve) => {
          resolveMetadata = resolve;
        })
      );
      renderWithTestingProviders(<EditObservableModal {...props} observable={editedObservable} />);

      await changeValue('shared');

      expect(screen.getByTestId('save-observable')).toBeDisabled();
      expect(screen.getByTestId('observable-metadata-loading')).toBeInTheDocument();

      await act(async () => resolveMetadata({ metadata: sharedMetadata }));
      await flushQueries();

      expect(screen.getByTestId('save-observable')).toBeEnabled();
      expect(screen.queryByTestId('observable-metadata-loading')).not.toBeInTheDocument();
      expect(inputValues('observable-metadata-key')).toEqual(['owner', 'triage']);
    });

    it('shows the metadata of the observable again when the value changes back', async () => {
      renderWithTestingProviders(<EditObservableModal {...props} observable={editedObservable} />);

      await changeValue('shared');
      expect(screen.getAllByTestId('observable-metadata-key')).toHaveLength(2);
      await changeValue(props.observable.value);

      expect(screen.getByTestId('observable-metadata-key')).toHaveValue('triage');
      expect(screen.getByTestId('observable-metadata-value')).toHaveValue('confirmed');
      expect(getObservableMetadata).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onCancel', async () => {
    renderWithTestingProviders(<EditObservableModal {...props} />);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Cancel'));

    expect(props.onCloseModal).toHaveBeenCalled();
  });
});
