/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { noCasesPermissions, renderWithTestingProviders } from '../../common/mock';
import type { ObservableTypesProps } from '.';
import { ObservableTypes } from '.';
import { observableTypesMock } from '../../containers/mock';
import * as i18n from './translations';
import { MAX_CUSTOM_OBSERVABLE_TYPES } from '../../../common/constants';

describe('ObservableTypes', () => {
  const props: ObservableTypesProps = {
    disabled: false,
    isLoading: false,
    observableTypes: [],
    handleAddObservableType: jest.fn(),
    handleEditObservableType: jest.fn(),
    handleDeleteObservableType: jest.fn(),
  };

  describe('with sufficient permissions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders correctly when there are no observable types', async () => {
      renderWithTestingProviders(<ObservableTypes {...props} />);
      expect(await screen.findByTestId('observable-types-form-group')).toBeInTheDocument();
      expect(screen.queryByTestId('observable-types-list')).not.toBeInTheDocument();
    });

    it('renders correctly when there are observable types', async () => {
      renderWithTestingProviders(
        <ObservableTypes {...{ ...props, observableTypes: observableTypesMock }} />
      );
      expect(await screen.findByTestId('observable-types-form-group')).toBeInTheDocument();
      expect(await screen.findByTestId('observable-types-list')).toBeInTheDocument();
    });

    it('shows error when custom fields reaches the limit', async () => {
      const generatedMockCustomFields = [];

      for (let i = 0; i < 11; i++) {
        generatedMockCustomFields.push({
          key: `field_key_${i + 1}`,
          label: `My custom label ${i + 1}`,
        });
      }

      const observableTypes = [...generatedMockCustomFields];

      renderWithTestingProviders(<ObservableTypes {...{ ...props, observableTypes }} />);

      expect(await screen.findByText(i18n.MAX_OBSERVABLE_TYPES_LIMIT(MAX_CUSTOM_OBSERVABLE_TYPES)));
      expect(screen.queryByTestId('add-observable-type')).not.toBeInTheDocument();
    });
  });

  describe('with insufficient permissions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders correctly when there are no observable types', async () => {
      renderWithTestingProviders(<ObservableTypes {...props} />, {
        wrapperProps: { permissions: noCasesPermissions() },
      });
      expect(screen.queryByTestId('observable-types-form-group')).not.toBeInTheDocument();
    });
  });
});
