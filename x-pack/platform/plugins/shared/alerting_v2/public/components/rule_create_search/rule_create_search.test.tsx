/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleCreateSearch } from './rule_create_search';
import type { RuleCreateSearchProps } from './rule_create_search';
import type { RuleCreateSearchSections } from './types';

const onSelectThreshold = jest.fn();
const onSelectEsQuery = jest.fn();
const onBrowseAll = jest.fn();

const SECTIONS: RuleCreateSearchSections = {
  universal: {
    items: [{ id: 'threshold', title: 'Monitor a threshold', onSelect: onSelectThreshold }],
    isLoading: false,
  },
  classic: {
    items: [{ id: 'es-query', title: 'Elasticsearch query', onSelect: onSelectEsQuery }],
    isLoading: false,
    headerAction: { label: 'Browse all', onClick: onBrowseAll },
  },
};

describe('RuleCreateSearch', () => {
  const onQueryChange = jest.fn();
  const onSendToAgent = jest.fn();

  const renderSearch = (props: Partial<RuleCreateSearchProps> = {}) =>
    render(
      <I18nProvider>
        <RuleCreateSearch
          sections={SECTIONS}
          onQueryChange={onQueryChange}
          onSendToAgent={onSendToAgent}
          {...props}
        />
      </I18nProvider>
    );

  const typeQuery = async (text: string) => {
    await userEvent.type(screen.getByTestId('ruleCreateSearchInput'), text);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the dropdown closed until the user types', () => {
    renderSearch();

    expect(screen.queryByText('Monitor a threshold')).not.toBeInTheDocument();
  });

  it('shows the section titles and items in order when the user types', async () => {
    renderSearch();

    await typeQuery('query');

    const universalTitle = await screen.findByText('Universal');
    const classicTitle = screen.getByText('Classic rule types');
    expect(
      universalTitle.compareDocumentPosition(classicTitle) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByTestId('ruleCreateSearchItem-universal-threshold')).toBeInTheDocument();
    expect(screen.getByTestId('ruleCreateSearchItem-classic-es-query')).toBeInTheDocument();
  });

  it('reports the trimmed query after the debounce', async () => {
    renderSearch();

    await typeQuery('  cpu  ');

    await waitFor(() => expect(onQueryChange).toHaveBeenLastCalledWith('cpu'));
  });

  it('calls the item onSelect and closes the dropdown when an item is clicked', async () => {
    renderSearch();
    await typeQuery('query');

    await userEvent.click(await screen.findByText('Elasticsearch query'));

    expect(onSelectEsQuery).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText('Elasticsearch query')).not.toBeInTheDocument());
  });

  it('calls the header action when its link is clicked', async () => {
    renderSearch();
    await typeQuery('query');

    await userEvent.click(await screen.findByTestId('ruleCreateSearchHeaderAction-classic'));

    expect(onBrowseAll).toHaveBeenCalledTimes(1);
  });

  it('closes the dropdown on Escape', async () => {
    renderSearch();
    await typeQuery('query');
    await screen.findByText('Monitor a threshold');

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByText('Monitor a threshold')).not.toBeInTheDocument());
  });

  it('highlights the first item while typing and selects it on Enter', async () => {
    renderSearch();

    await typeQuery('query');
    await screen.findByText('Monitor a threshold');
    await userEvent.keyboard('{Enter}');

    expect(onSelectThreshold).toHaveBeenCalledTimes(1);
    expect(onSendToAgent).not.toHaveBeenCalled();
  });

  it('moves the highlight with the arrow keys', async () => {
    renderSearch();
    await typeQuery('query');
    await screen.findByText('Monitor a threshold');

    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect(onSelectEsQuery).toHaveBeenCalledTimes(1);
    expect(onSelectThreshold).not.toHaveBeenCalled();
  });

  it('sends the text to the agent when the button is clicked', async () => {
    renderSearch();
    await typeQuery('alert on cpu');

    await userEvent.click(await screen.findByTestId('ruleCreateSearchSendToAgent'));

    expect(onSendToAgent).toHaveBeenCalledWith('alert on cpu');
  });

  it('shows the empty message and still sends to the agent when nothing matches', async () => {
    renderSearch({ sections: {} });

    await typeQuery('  alert on cpu  {Enter}');

    // EUI also announces the message in a screen reader live region, hence findAll.
    expect(
      await screen.findAllByText('No matching builders, templates, or Classic rule types')
    ).not.toHaveLength(0);
    expect(onSendToAgent).toHaveBeenCalledWith('alert on cpu');
  });

  it('shows a loading indicator for a section that is still loading', async () => {
    renderSearch({ sections: { classic: { items: [], isLoading: true } } });

    await typeQuery('query');

    expect(await screen.findByLabelText('Loading results')).toBeInTheDocument();
  });

  it('hides the agent footer without onSendToAgent', async () => {
    renderSearch({ onSendToAgent: undefined });

    await typeQuery('query');

    await screen.findByText('Monitor a threshold');
    expect(screen.queryByTestId('ruleCreateSearchSendToAgent')).not.toBeInTheDocument();
  });
});
