/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';

import { AddToNewCaseAction } from '.';
import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../../mock/test_providers/test_providers';
import userEvent from '@testing-library/user-event';

describe('AddToNewCaseAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render add to new case link', () => {
    render(
      <TestExternalProviders>
        <TestDataQualityProviders>
          <AddToNewCaseAction markdownComment="test markdown" />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    expect(screen.getByTestId('addToNewCase')).toHaveTextContent('Add to new case');
  });

  describe('when ilm phases are not provided', () => {
    it('should render disabled add to new case link', () => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders dataQualityContextProps={{ ilmPhases: [] }}>
            <AddToNewCaseAction markdownComment="test markdown" />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      expect(screen.getByTestId('addToNewCase')).toBeDisabled();
    });
  });

  describe('when createAndReadCases() returns false', () => {
    it('should render disabled add to new case link', () => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders
            dataQualityContextProps={{ canUserCreateAndReadCases: () => false }}
          >
            <AddToNewCaseAction markdownComment="test markdown" />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      expect(screen.getByTestId('addToNewCase')).toBeDisabled();
    });
  });

  describe('when clicking on add to new case link', () => {
    it('should open create case flyout with header content and provided markdown', () => {
      let headerContent: React.ReactNode = null;
      const openCreateCaseFlyout = jest.fn(({ headerContent: _headerContent }) => {
        headerContent = render(_headerContent).container;
      });
      render(
        <TestExternalProviders>
          <TestDataQualityProviders dataQualityContextProps={{ openCreateCaseFlyout }}>
            <AddToNewCaseAction markdownComment="test markdown" />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      userEvent.click(screen.getByTestId('addToNewCase'));

      expect(openCreateCaseFlyout).toHaveBeenCalledWith({
        comments: ['test markdown'],
        headerContent: expect.anything(),
      });

      expect(headerContent).toContainHTML('<div>Create a data quality case</div>');
    });
  });
});
