/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DatasetTagsSummary } from './dataset_tags_summary';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('DatasetTagsSummary', () => {
  it('renders nothing when a dataset has neither maturity nor tags', () => {
    const { container } = render(<DatasetTagsSummary tags={[]} />, { wrapper: Wrapper });

    expect(container.firstChild).toBeNull();
  });

  it('labels maturity and tags so a shared value stays unambiguous', () => {
    render(<DatasetTagsSummary maturity="golden" tags={['golden', 'esql']} />, {
      wrapper: Wrapper,
    });

    // The maturity badge is title-cased while the tag keeps the stored casing, so
    // the two `golden` values are distinguishable alongside their labels.
    expect(screen.getByText('Maturity')).toBeInTheDocument();
    expect(screen.getByText('Golden')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('golden')).toBeInTheDocument();
    expect(screen.getByText('esql')).toBeInTheDocument();
  });

  it('omits the maturity label when no level is set', () => {
    render(<DatasetTagsSummary tags={['esql']} />, { wrapper: Wrapper });

    expect(screen.queryByText('Maturity')).not.toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('omits the tags label when a dataset has none', () => {
    render(<DatasetTagsSummary maturity="raw" tags={[]} />, { wrapper: Wrapper });

    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    expect(screen.getByText('Maturity')).toBeInTheDocument();
    expect(screen.getByText('Raw')).toBeInTheDocument();
  });
});
