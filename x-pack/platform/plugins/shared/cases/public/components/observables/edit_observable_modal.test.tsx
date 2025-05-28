/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';

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

  it('calls onCancel', async () => {
    renderWithTestingProviders(<EditObservableModal {...props} />);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Cancel'));

    expect(props.onCloseModal).toHaveBeenCalled();
  });
});
