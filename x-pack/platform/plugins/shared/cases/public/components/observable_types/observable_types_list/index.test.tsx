/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within, fireEvent } from '@testing-library/react';

import { ObservableTypesList, type ObservableTypesListProps } from '.';
import { renderWithTestingProviders } from '../../../common/mock';

const observableTypes = [
  { label: 'Test Observable Type', key: 'deb68304-da86-483c-b5ed-ff5b3420e340' },
  { label: 'Test Observable Type vol 2', key: '532433db-045f-4ccc-b73c-db9441f0eefa' },
];

describe('ObservableTypesList', () => {
  const props: ObservableTypesListProps = {
    disabled: false,
    observableTypes,
    onDeleteObservableType: jest.fn(),
    onEditObservableType: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    renderWithTestingProviders(<ObservableTypesList {...props} />);

    expect(screen.getByTestId('observable-types-list')).toBeInTheDocument();
  });

  it('shows ObservableTypesList correctly', () => {
    renderWithTestingProviders(<ObservableTypesList {...props} />);

    expect(screen.getByTestId('observable-types-list')).toBeInTheDocument();

    expect(screen.getByTestId(`observable-type-${observableTypes[0].key}`)).toBeInTheDocument();
    expect(screen.getByText('Test Observable Type')).toBeInTheDocument();
    expect(screen.getByTestId(`observable-type-${observableTypes[1].key}`)).toBeInTheDocument();
  });

  describe('Delete', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('shows confirmation modal when deleting a field ', () => {
      renderWithTestingProviders(<ObservableTypesList {...props} />);

      const list = screen.getByTestId('observable-types-list');

      fireEvent.click(within(list).getByTestId(`${observableTypes[0].key}-observable-type-delete`));

      expect(screen.getByTestId('confirm-delete-modal')).toBeInTheDocument();
    });

    it('calls onDeleteObservableType when confirm', () => {
      renderWithTestingProviders(<ObservableTypesList {...props} />);

      const list = screen.getByTestId('observable-types-list');

      fireEvent.click(within(list).getByTestId(`${observableTypes[0].key}-observable-type-delete`));

      expect(screen.getByTestId('confirm-delete-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Delete'));

      expect(screen.queryByTestId('confirm-delete-modal')).not.toBeInTheDocument();
      expect(props.onDeleteObservableType).toHaveBeenCalledWith(observableTypes[0].key);
    });

    it('does not call onDeleteObservableType when cancel', () => {
      renderWithTestingProviders(<ObservableTypesList {...props} />);

      const list = screen.getByTestId('observable-types-list');

      fireEvent.click(within(list).getByTestId(`${observableTypes[0].key}-observable-type-delete`));

      expect(screen.getByTestId('confirm-delete-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));

      expect(screen.queryByTestId('confirm-delete-modal')).not.toBeInTheDocument();
      expect(props.onDeleteObservableType).not.toHaveBeenCalled();
    });
  });

  describe('Edit', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls onEditObservableType correctly', () => {
      renderWithTestingProviders(<ObservableTypesList {...props} />);

      const list = screen.getByTestId('observable-types-list');

      fireEvent.click(within(list).getByTestId(`${observableTypes[0].key}-observable-type-edit`));

      expect(props.onEditObservableType).toHaveBeenCalledWith(observableTypes[0].key);
    });
  });

  describe('useLineSeparators', () => {
    it('renders each item inside a panel by default', () => {
      renderWithTestingProviders(<ObservableTypesList {...props} />);

      const item = screen.getByTestId(`observable-type-${observableTypes[0].key}`);

      expect(item.className).toContain('euiPanel');
    });

    it('renders line-separated rows without panels when useLineSeparators is true', () => {
      renderWithTestingProviders(<ObservableTypesList {...props} useLineSeparators />);

      const item = screen.getByTestId(`observable-type-${observableTypes[0].key}`);

      expect(item.className).not.toContain('euiPanel');
      expect(screen.getByText('Test Observable Type')).toBeInTheDocument();
    });

    it('still supports edit and delete actions when useLineSeparators is true', () => {
      renderWithTestingProviders(<ObservableTypesList {...props} useLineSeparators />);

      const list = screen.getByTestId('observable-types-list');

      fireEvent.click(within(list).getByTestId(`${observableTypes[0].key}-observable-type-delete`));

      expect(screen.getByTestId('confirm-delete-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Delete'));

      expect(props.onDeleteObservableType).toHaveBeenCalledWith(observableTypes[0].key);
    });
  });
});
