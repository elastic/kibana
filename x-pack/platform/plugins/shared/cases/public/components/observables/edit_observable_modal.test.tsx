/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';

import { renderWithTestingProviders } from '../../common/mock';
import { EditObservableModal, type EditObservableModalProps } from './edit_observable_modal';
import { mockCase } from '../../containers/mock';
import { patchObservable } from '../../containers/api';

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

  it('calls onCancel', async () => {
    renderWithTestingProviders(<EditObservableModal {...props} />);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Cancel'));

    expect(props.onCloseModal).toHaveBeenCalled();
  });
});
