/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { EntityAnalyticsUpsellingPage } from './entity_analytics';

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
      <EntityAnalyticsUpsellingPage
        upgradeMessage="test upgrade message"
        upgradeToLabel="TEST LICENSE"
      />
    );
    expect(getByTestId('paywallCardDescription')).toBeInTheDocument();
  });

  it('should show upgrade label badge', () => {
    const { getByText } = render(
      <EntityAnalyticsUpsellingPage
        upgradeToLabel="TEST PRODUCT"
        upgradeMessage="test upgrade message"
      />
    );

    expect(getByText('TEST PRODUCT')).toBeInTheDocument();
  });

  it('should show license message', () => {
    const { getByTestId } = render(
      <EntityAnalyticsUpsellingPage
        upgradeToLabel="TEST PRODUCT"
        upgradeMessage="test upgrade message"
      />
    );

    expect(getByTestId('paywallCardDescription')).toHaveTextContent('test upgrade message');
  });
});
