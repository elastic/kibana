/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { CentralizedActionPoliciesPanel } from './centralized_action_policies_panel';

const renderPanel = () => {
  const http = httpServiceMock.createStartContract();
  jest.spyOn(http.basePath, 'prepend').mockImplementation((path: string) => `/mock${path}`);

  render(
    <IntlProvider locale="en">
      <CentralizedActionPoliciesPanel http={http} />
    </IntlProvider>
  );

  return { http };
};

describe('CentralizedActionPoliciesPanel', () => {
  it('renders the title, description, and CTA labels', () => {
    renderPanel();

    expect(screen.getByText('Centralized action policies')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Action Policies let you manage notification channels in one place and reuse them across multiple rules.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('centralizedActionPoliciesCreate')).toBeInTheDocument();
    expect(screen.getByTestId('centralizedActionPoliciesLearnMore')).toBeInTheDocument();
  });

  it('"Create action policy" opens the action policies create page in a new tab', () => {
    renderPanel();

    const createButton = screen.getByTestId('centralizedActionPoliciesCreate');
    expect(createButton).toHaveAttribute('target', '_blank');
    expect(createButton).toHaveAttribute(
      'href',
      '/mock/app/management/alertingV2/action_policies/create'
    );
  });

  it('"Learn more" opens the docs URL in a new tab', () => {
    renderPanel();

    const learnMoreButton = screen.getByTestId('centralizedActionPoliciesLearnMore');
    expect(learnMoreButton).toHaveAttribute('target', '_blank');
    expect(learnMoreButton).toHaveAttribute(
      'href',
      'https://www.elastic.co/docs/explore-analyze/alerts-cases/alerts'
    );
  });
});
