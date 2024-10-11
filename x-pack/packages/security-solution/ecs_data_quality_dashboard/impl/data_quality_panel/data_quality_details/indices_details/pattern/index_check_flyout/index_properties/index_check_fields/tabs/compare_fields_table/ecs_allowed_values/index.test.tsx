/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { mockAllowedValues } from '../../../../../../../../../mock/allowed_values/mock_allowed_values';
import { TestExternalProviders } from '../../../../../../../../../mock/test_providers/test_providers';
import { EcsAllowedValues } from '.';

describe('EcsAllowedValues', () => {
  describe('when `allowedValues` exists', () => {
    beforeEach(() => {
      render(
        <TestExternalProviders>
          <EcsAllowedValues allowedValues={mockAllowedValues} />
        </TestExternalProviders>
      );
    });

    test('it renders the allowed values', () => {
      expect(screen.getByTestId('ecsAllowedValues')).toHaveTextContent(
        mockAllowedValues.map(({ name }) => `${name}`).join('')
      );
    });

    test('it does NOT render the placeholder', () => {
      expect(screen.queryByTestId('ecsAllowedValuesEmpty')).not.toBeInTheDocument();
    });
  });

  describe('when `allowedValues` is undefined', () => {
    beforeEach(() => {
      render(
        <TestExternalProviders>
          <EcsAllowedValues allowedValues={undefined} />
        </TestExternalProviders>
      );
    });

    test('it does NOT render the allowed values', () => {
      expect(screen.queryByTestId('ecsAllowedValues')).not.toBeInTheDocument();
    });

    test('it renders the placeholder', () => {
      expect(screen.getByTestId('ecsAllowedValuesEmpty')).toBeInTheDocument();
    });
  });
});
