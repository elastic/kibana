/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import { LinksList } from './links_list';
import userEvent from '@testing-library/user-event';

describe('LinksList', () => {
  const editAction = jest.fn();

  const options = {
    index: 0,
    errors: {
      links: [],
    },
    editAction,
    links: [],
  };

  beforeEach(() => jest.clearAllMocks());

  it('the list is empty by default', () => {
    render(<LinksList {...options} />);

    expect(screen.queryByTestId('linksListItemRow')).not.toBeInTheDocument();
  });

  it('clicking add button calls editAction with correct params', async () => {
    render(<LinksList {...options} />);

    await userEvent.click(await screen.findByTestId('pagerDutyAddLinkButton'));

    expect(editAction).toHaveBeenCalledWith('links', [{ href: '', text: '' }], 0);
  });

  it('clicking remove link button calls editAction with correct params', async () => {
    render(
      <LinksList
        {...options}
        links={[
          { href: '1', text: 'foobar' },
          { href: '2', text: 'foobar' },
          { href: '3', text: 'foobar' },
        ]}
      />
    );

    expect(await screen.findAllByTestId('linksListItemRow', { exact: false })).toHaveLength(3);

    await userEvent.click((await screen.findAllByTestId('pagerDutyRemoveLinkButton'))[1]);

    expect(editAction).toHaveBeenCalledWith(
      'links',
      [
        { href: '1', text: 'foobar' },
        { href: '3', text: 'foobar' },
      ],
      0
    );
  });

  it('editing a link href field calls editAction with correct params', async () => {
    render(<LinksList {...options} links={[{ href: '', text: 'foobar' }]} />);

    expect(await screen.findByTestId('linksListItemRow', { exact: false })).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('linksHrefInput'));
    await userEvent.paste('newHref');

    expect(editAction).toHaveBeenCalledWith('links', [{ href: 'newHref', text: 'foobar' }], 0);
  });

  it('editing a link text field calls editAction with correct params', async () => {
    render(<LinksList {...options} links={[{ href: 'foobar', text: '' }]} />);

    expect(await screen.findByTestId('linksListItemRow', { exact: false })).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('linksTextInput'));
    await userEvent.paste('newText');

    expect(editAction).toHaveBeenCalledWith('links', [{ href: 'foobar', text: 'newText' }], 0);
  });

  it('correctly displays error messages', async () => {
    render(<LinksList {...options} errors={{ links: ['FoobarError'] }} />);

    expect(await screen.findByText('FoobarError'));
  });
});
