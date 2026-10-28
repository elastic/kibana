/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagBadges } from './tags';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

describe('TagBadges', () => {
  it('renders visible tags up to size', () => {
    render(
      <IntlProvider locale="en">
        <TagBadges tags={['alpha', 'beta']} size={2} />
      </IntlProvider>
    );
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
  });

  it('renders overflow count badge when tags exceed size', () => {
    render(
      <IntlProvider locale="en">
        <TagBadges tags={['a', 'b', 'c', 'd', 'e']} size={3} />
      </IntlProvider>
    );
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.getByText('c')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('opens popover with remaining tags when overflow badge is clicked', async () => {
    const user = userEvent.setup();

    render(
      <IntlProvider locale="en">
        <TagBadges tags={['a', 'b', 'c', 'd']} size={2} />
      </IntlProvider>
    );
    await user.click(screen.getByText('+2'));
    expect(await screen.findByText('c')).toBeInTheDocument();
    expect(await screen.findByText('d')).toBeInTheDocument();
  });

  it('separates the badges with a real space so the line can break between them', () => {
    const { container } = render(
      <IntlProvider locale="en">
        <TagBadges tags={['a', 'b']} />
      </IntlProvider>
    );

    expect(container.firstChild).toHaveTextContent('a b');
  });

  it('lays the badges out as inline content, so the grid line clamp can count them', () => {
    const { container } = render(
      <IntlProvider locale="en">
        <TagBadges tags={['a', 'b', 'c', 'd']} size={2} />
      </IntlProvider>
    );

    expect(container.firstChild?.nodeName).toBe('SPAN');
    expect(container.querySelector('.euiFlexGroup')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  describe('showAll', () => {
    it('renders every tag as its own badge, ignoring size', () => {
      render(
        <IntlProvider locale="en">
          <TagBadges tags={['a', 'b', 'c', 'd', 'e']} size={2} showAll />
        </IntlProvider>
      );

      ['a', 'b', 'c', 'd', 'e'].forEach((tag) => expect(screen.getByText(tag)).toBeInTheDocument());
      expect(screen.queryByText('+3')).not.toBeInTheDocument();
    });
  });

  it('renders an em dash when tags is empty', () => {
    const { container } = render(
      <IntlProvider locale="en">
        <TagBadges tags={[]} size={2} data-test-subj="tags" />
      </IntlProvider>
    );

    expect(screen.getByTestId('tags')).toHaveTextContent('—');
    expect(container.querySelector('.euiBadge')).not.toBeInTheDocument();
  });

  it('renders an em dash when tags is omitted', () => {
    render(
      <IntlProvider locale="en">
        <TagBadges size={2} data-test-subj="tags" />
      </IntlProvider>
    );

    expect(screen.getByTestId('tags')).toHaveTextContent('—');
  });
});
