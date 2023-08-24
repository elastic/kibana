/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import EntityAnalyticsUpsellingComponent from './entity_analytics';

jest.mock('@kbn/security-solution-navigation', () => {
  const original = jest.requireActual('@kbn/security-solution-navigation');
  return {
    ...original,
    useNavigation: () => ({
      navigateTo: jest.fn(),
    }),
  };
});

describe('EntityAnalyticsUpselling', () => {
  it('should render', () => {
    const { getByTestId } = render(
      <EntityAnalyticsUpsellingComponent requiredLicense="TEST LICENSE" />
    );
    expect(getByTestId('paywallCardDescription')).toBeInTheDocument();
  });

  it('should throw exception when requiredLicense and requiredProduct are not provided', () => {
    expect(() => render(<EntityAnalyticsUpsellingComponent />)).toThrow();
  });

  it('should show product message when requiredProduct is provided', () => {
    const { getByTestId } = render(
      <EntityAnalyticsUpsellingComponent
        requiredProduct="TEST PRODUCT"
        requiredLicense="TEST LICENSE"
      />
    );

    expect(getByTestId('paywallCardDescription')).toHaveTextContent(
      'Entity risk scoring capability is available in our TEST PRODUCT license tier'
    );
  });

  it('should show product badge when requiredProduct is provided', () => {
    const { getByText } = render(
      <EntityAnalyticsUpsellingComponent
        requiredProduct="TEST PRODUCT"
        requiredLicense="TEST LICENSE"
      />
    );

    expect(getByText('TEST PRODUCT')).toBeInTheDocument();
  });

  it('should show license message when requiredLicense is provided', () => {
    const { getByTestId } = render(
      <EntityAnalyticsUpsellingComponent requiredLicense="TEST LICENSE" />
    );

    expect(getByTestId('paywallCardDescription')).toHaveTextContent(
      'This feature is available with TEST LICENSE or higher subscription'
    );
  });

  it('should show license badge when requiredLicense is provided', () => {
    const { getByText } = render(
      <EntityAnalyticsUpsellingComponent requiredLicense="TEST LICENSE" />
    );

    expect(getByText('TEST LICENSE')).toBeInTheDocument();
  });
});
