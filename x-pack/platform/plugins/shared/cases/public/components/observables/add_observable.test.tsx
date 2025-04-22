/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { noCasesPermissions, renderWithTestingProviders } from '../../common/mock';
import type { AddObservableProps } from './add_observable';
import { AddObservable } from './add_observable';
import { mockCase } from '../../containers/mock';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { OBSERVABLE_TYPE_IPV4 } from '../../../common/constants';
import { postObservable } from '../../containers/api';

jest.mock('../../containers/api');

const platinumLicense = licensingMock.createLicense({
  license: { type: 'platinum' },
});

const basicLicense = licensingMock.createLicense({
  license: { type: 'basic' },
});

describe('AddObservable', () => {
  const props: AddObservableProps = {
    caseData: mockCase,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the button as enabled when subscribed to platinum', async () => {
    renderWithTestingProviders(<AddObservable {...props} />, {
      wrapperProps: { license: platinumLicense },
    });

    const addButton = screen.getByTestId('cases-observables-add');

    expect(addButton).toBeInTheDocument();
    expect(addButton).toBeEnabled();
  });

  it('opens the modal when clicked', async () => {
    renderWithTestingProviders(<AddObservable {...props} />, {
      wrapperProps: { license: platinumLicense },
    });

    const addButton = screen.getByTestId('cases-observables-add');

    expect(addButton).toBeInTheDocument();
    expect(addButton).toBeEnabled();

    await userEvent.click(addButton);

    expect(await screen.findByTestId('cases-observables-add-modal')).toBeInTheDocument();
  });

  it('submits the data on save', async () => {
    renderWithTestingProviders(<AddObservable {...props} />, {
      wrapperProps: { license: platinumLicense },
    });

    await userEvent.click(screen.getByTestId('cases-observables-add'));

    await userEvent.selectOptions(
      screen.getByTestId('observable-type-select'),
      OBSERVABLE_TYPE_IPV4.key
    );

    await userEvent.click(screen.getByTestId('observable-value-field'));
    await userEvent.paste('127.0.0.1');

    await userEvent.click(screen.getByTestId('save-observable'));

    expect(screen.queryByTestId('cases-observables-add-modal')).not.toBeInTheDocument();

    expect(jest.mocked(postObservable)).toHaveBeenCalledWith(
      { observable: { description: '', typeKey: 'observable-type-ipv4', value: '127.0.0.1' } },
      'mock-id'
    );
  });

  it('renders the button as disabled when license is too low', async () => {
    renderWithTestingProviders(<AddObservable {...props} />, {
      wrapperProps: { license: basicLicense },
    });

    const addButton = screen.getByTestId('cases-observables-add');

    expect(addButton).toBeInTheDocument();
    expect(addButton).toBeDisabled();
  });

  it('does not render the button with insufficient permissions', async () => {
    renderWithTestingProviders(<AddObservable {...props} />, {
      wrapperProps: { permissions: noCasesPermissions() },
    });

    expect(screen.queryByTestId('cases-observables-add')).not.toBeInTheDocument();
  });
});
