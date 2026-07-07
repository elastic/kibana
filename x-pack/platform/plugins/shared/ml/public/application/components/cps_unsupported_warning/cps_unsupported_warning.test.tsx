/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { useMlKibana } from '../../contexts/kibana/kibana_context';

import { CPSUnsupportedWarning } from './cps_unsupported_warning';

jest.mock('../../contexts/kibana/kibana_context');

const mockStorage = {
  get: jest.fn(),
  set: jest.fn(),
};

const createCpsManagerMock = (totalProjectCount: number) => ({
  getTotalProjectCount: jest.fn().mockReturnValue(totalProjectCount),
});

const renderComponent = () =>
  render(
    <IntlProvider>
      <CPSUnsupportedWarning />
    </IntlProvider>
  );

describe('CPSUnsupportedWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when CPS is not enabled', () => {
    (useMlKibana as jest.Mock).mockReturnValue({
      services: { cps: undefined, storage: mockStorage },
    });

    const { container } = renderComponent();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when cpsManager is not present', () => {
    (useMlKibana as jest.Mock).mockReturnValue({
      services: { cps: {}, storage: mockStorage },
    });

    const { container } = renderComponent();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when getTotalProjectCount returns less than 2', () => {
    (useMlKibana as jest.Mock).mockReturnValue({
      services: {
        cps: { cpsManager: createCpsManagerMock(1) },
        storage: mockStorage,
      },
    });

    const { container } = renderComponent();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the callout when CPS is enabled and not dismissed', () => {
    mockStorage.get.mockReturnValue(undefined);
    (useMlKibana as jest.Mock).mockReturnValue({
      services: {
        cps: { cpsManager: createCpsManagerMock(2) },
        storage: mockStorage,
      },
    });

    renderComponent();

    expect(screen.getByTestId('mlCpsUnsupportedCallout')).toBeInTheDocument();
  });

  it('renders nothing when CPS is enabled but previously dismissed', () => {
    mockStorage.get.mockReturnValue(true);
    (useMlKibana as jest.Mock).mockReturnValue({
      services: {
        cps: { cpsManager: createCpsManagerMock(2) },
        storage: mockStorage,
      },
    });

    const { container } = renderComponent();
    expect(container).toBeEmptyDOMElement();
  });

  it('dismisses the callout and persists to storage on click', () => {
    mockStorage.get.mockReturnValue(undefined);
    (useMlKibana as jest.Mock).mockReturnValue({
      services: {
        cps: { cpsManager: createCpsManagerMock(2) },
        storage: mockStorage,
      },
    });

    renderComponent();

    expect(screen.getByTestId('mlCpsUnsupportedCallout')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mlCpsUnsupportedCalloutDismiss'));

    expect(screen.queryByTestId('mlCpsUnsupportedCallout')).not.toBeInTheDocument();
    expect(mockStorage.set).toHaveBeenCalledWith('ml.cpsUnsupportedCalloutDismissed', true);
  });
});
