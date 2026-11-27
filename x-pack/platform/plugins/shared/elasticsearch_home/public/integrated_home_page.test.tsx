/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithHomeContext } from './test_utils';
import { IntegratedHomePage } from './integrated_home_page';

jest.mock('./components/integrated_home_header', () => ({
  IntegratedHomeHeader: () => <div data-test-subj="integratedHomeHeader" />,
}));
jest.mock('./components/onboarding_wizard_cards', () => ({
  OnboardingWizardCards: () => <div data-test-subj="onboardingWizardCards" />,
}));

const DOCS_URL = 'https://elastic.co/docs/vector-database';
const DOCS_LABEL = 'Learn more about Elasticsearch Vector Database';

describe('IntegratedHomePage', () => {
  const renderPage = () =>
    renderWithHomeContext(<IntegratedHomePage />, {
      config: { docsLink: { href: DOCS_URL, label: DOCS_LABEL } },
    });

  it('renders the header and the onboarding wizard cards', () => {
    renderPage();

    expect(screen.getByTestId('integratedHomeHeader')).toBeInTheDocument();
    expect(screen.getByTestId('onboardingWizardCards')).toBeInTheDocument();
  });

  it("links to the host's documentation, namespaced under its telemetry prefix", () => {
    renderPage();

    const link = screen.getByTestId('elasticsearchHomeDocumentationLink');
    expect(link).toHaveAttribute('href', DOCS_URL);
    expect(link).toHaveTextContent(DOCS_LABEL);
    expect(link).toHaveAttribute('data-telemetry-id', 'testHost-home-documentationLink');
  });
});
