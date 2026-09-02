/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { DatasetMaturityBadge, DatasetTagBadges } from './dataset_tag_badges';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('DatasetTagBadges', () => {
  it('renders nothing when a dataset has no tags', () => {
    const { container } = render(<DatasetTagBadges tags={[]} />, { wrapper: Wrapper });

    expect(container.firstChild).toBeNull();
  });

  it('renders every tag when no limit is set', () => {
    render(<DatasetTagBadges tags={['esql', 'golden', 'oblt']} />, { wrapper: Wrapper });

    expect(screen.getByText('esql')).toBeInTheDocument();
    expect(screen.getByText('golden')).toBeInTheDocument();
    expect(screen.getByText('oblt')).toBeInTheDocument();
  });

  it('collapses tags past the limit into a single badge', () => {
    render(<DatasetTagBadges tags={['esql', 'golden', 'oblt', 'search']} maxVisibleTags={2} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText('esql')).toBeInTheDocument();
    expect(screen.getByText('golden')).toBeInTheDocument();
    expect(screen.queryByText('oblt')).not.toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('reports the clicked tag without letting the click reach the row', async () => {
    const onTagClick = jest.fn();
    const onRowClick = jest.fn();

    render(
      <div role="button" tabIndex={0} onClick={onRowClick} onKeyDown={onRowClick}>
        <DatasetTagBadges tags={['esql']} onTagClick={onTagClick} />
      </div>,
      { wrapper: Wrapper }
    );

    await userEvent.click(screen.getByText('esql'));

    expect(onTagClick).toHaveBeenCalledWith('esql');
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe('DatasetMaturityBadge', () => {
  it('renders nothing when maturity is not set', () => {
    const { container } = render(<DatasetMaturityBadge />, { wrapper: Wrapper });

    expect(container.firstChild).toBeNull();
  });

  it('renders a readable label for a maturity level', () => {
    render(<DatasetMaturityBadge maturity="golden" />, { wrapper: Wrapper });

    expect(screen.getByTestId('datasetMaturityBadge')).toHaveTextContent('Golden');
  });
});
