/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { LinkedInvestigationsList } from './linked_investigations_list';
import type { LinkedInvestigationItem } from './linked_investigations_list';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiProvider>
);

const renderList = (props: Partial<React.ComponentProps<typeof LinkedInvestigationsList>> = {}) =>
  render(
    <LinkedInvestigationsList
      items={undefined}
      isLoading={false}
      isError={false}
      onClickItem={jest.fn()}
      {...props}
    />,
    { wrapper }
  );

const ITEMS: LinkedInvestigationItem[] = [
  { id: 'inv-1', title: 'Mass file encryption', status: 'open' },
  { id: 'inv-2', title: 'Privilege escalation', status: 'closed' },
];

describe('LinkedInvestigationsList', () => {
  it('renders a loading skeleton while isLoading is true', () => {
    renderList({ isLoading: true });
    expect(screen.getByTestId('linkedInvestigationsLoading')).toBeInTheDocument();
  });

  it('renders an error callout when isError is true', () => {
    renderList({ isError: true });
    expect(screen.getByTestId('linkedInvestigationsError')).toBeInTheDocument();
  });

  it('renders the empty state when items is an empty array', () => {
    renderList({ items: [] });
    expect(screen.getByTestId('linkedInvestigationsEmpty')).toBeInTheDocument();
  });

  it('renders the empty state when items is undefined', () => {
    renderList({ items: undefined });
    expect(screen.getByTestId('linkedInvestigationsEmpty')).toBeInTheDocument();
  });

  it('renders a row for each item', () => {
    renderList({ items: ITEMS });
    expect(screen.getByTestId('linkedInvestigationRow-inv-1')).toBeInTheDocument();
    expect(screen.getByTestId('linkedInvestigationRow-inv-2')).toBeInTheDocument();
  });

  it('shows the title text in each row', () => {
    renderList({ items: ITEMS });
    expect(screen.getByText('Mass file encryption')).toBeInTheDocument();
    expect(screen.getByText('Privilege escalation')).toBeInTheDocument();
  });

  it('shows the Open status badge for open investigations', () => {
    renderList({ items: [ITEMS[0]] });
    expect(screen.getByTestId('linkedInvestigationStatus-inv-1')).toHaveTextContent('Open');
  });

  it('shows the Closed status badge for closed investigations', () => {
    renderList({ items: [ITEMS[1]] });
    expect(screen.getByTestId('linkedInvestigationStatus-inv-2')).toHaveTextContent('Closed');
  });

  it('calls onClickItem with the row id when clicked', () => {
    const onClickItem = jest.fn();
    renderList({ items: ITEMS, onClickItem });
    fireEvent.click(screen.getByTestId('linkedInvestigationRow-inv-1'));
    expect(onClickItem).toHaveBeenCalledWith('inv-1');
  });

  it('calls onClickItem when Enter is pressed on a row', async () => {
    const onClickItem = jest.fn();
    renderList({ items: ITEMS, onClickItem });
    const row = screen.getByTestId('linkedInvestigationRow-inv-2');
    row.focus();
    await userEvent.keyboard('{Enter}');
    expect(onClickItem).toHaveBeenCalledWith('inv-2');
  });

  it('calls onClickItem when Space is pressed on a row', async () => {
    const onClickItem = jest.fn();
    renderList({ items: ITEMS, onClickItem });
    const row = screen.getByTestId('linkedInvestigationRow-inv-1');
    row.focus();
    await userEvent.keyboard(' ');
    expect(onClickItem).toHaveBeenCalledWith('inv-1');
  });
});
