/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { CustomizeLandingEmptyState } from './customize_landing_empty_state';

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

describe('CustomizeLandingEmptyState', () => {
  it('renders title, description, learn more link, and actions', () => {
    renderWithIntl(
      <CustomizeLandingEmptyState
        dataTestSubj="testEmptyState"
        illustrationSrc="https://example.com/illustration.svg"
        title="Add skills"
        description={<span>Description with copy.</span>}
        learnMoreHref="https://example.com/docs"
        primaryAction={
          <EuiButton data-test-subj="testPrimary" fill>
            Add skills
          </EuiButton>
        }
        secondaryAction={
          <EuiButtonEmpty data-test-subj="testSecondary" href="/manage/skills">
            Manage all skills
          </EuiButtonEmpty>
        }
      />
    );

    expect(screen.getByTestId('testEmptyState')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add skills' })).toBeInTheDocument();
    expect(screen.getByText('Description with copy.')).toBeInTheDocument();
    const learnMore = screen.getByTestId('testEmptyStateLearnMoreLink');
    expect(learnMore).toHaveAttribute('href', 'https://example.com/docs');
    expect(learnMore).toHaveAttribute('target', '_blank');
    expect(learnMore).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByTestId('testPrimary')).toBeInTheDocument();
    expect(screen.getByTestId('testSecondary')).toBeInTheDocument();
  });

  it('omits actions section when no primary or secondary action is provided', () => {
    renderWithIntl(
      <CustomizeLandingEmptyState
        illustrationSrc="https://example.com/illustration.svg"
        title="Title"
        description="Body"
        learnMoreHref="https://example.com/docs"
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders footer content when provided', () => {
    renderWithIntl(
      <CustomizeLandingEmptyState
        dataTestSubj="withFooter"
        illustrationSrc="https://example.com/illustration.svg"
        title="Title"
        description="Body text."
        learnMoreHref="https://example.com/docs"
        footer={<span data-test-subj="emptyStateFooterContent">Footer note</span>}
      />
    );

    expect(screen.getByTestId('emptyStateFooterContent')).toHaveTextContent('Footer note');
  });

  it('renders learn more suffix as plain text after the link', () => {
    renderWithIntl(
      <CustomizeLandingEmptyState
        dataTestSubj="suffixTest"
        illustrationSrc="https://example.com/illustration.svg"
        title="Title"
        description="Body."
        learnMoreHref="https://example.com/docs"
        learnMoreLabel="Learn more"
        learnMoreSuffix=" about plugins."
      />
    );

    const learnMore = screen.getByTestId('suffixTestLearnMoreLink');
    expect(learnMore).toHaveAttribute('href', 'https://example.com/docs');
    expect(learnMore).toHaveTextContent('Learn more');
    expect(screen.getByText(/about plugins\./)).toBeInTheDocument();
  });
});
