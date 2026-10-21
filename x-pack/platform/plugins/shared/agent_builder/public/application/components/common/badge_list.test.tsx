/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { BadgeList } from './badge_list';
import { Labels } from './labels';

const renderBadges = (items: string[], numVisible?: number) =>
  render(
    <IntlProvider locale="en">
      <BadgeList
        items={items}
        numVisible={numVisible}
        ariaLabel="Things"
        testSubjPrefix="thing"
        data-test-subj="things"
      />
    </IntlProvider>
  );

describe('BadgeList', () => {
  it('renders one badge per item', () => {
    renderBadges(['alpha', 'beta']);

    expect(screen.getByTestId('thing-alpha')).toBeInTheDocument();
    expect(screen.getByTestId('thing-beta')).toBeInTheDocument();
  });

  it('renders nothing when there are no items', () => {
    renderBadges([]);

    expect(screen.queryByTestId('things')).not.toBeInTheDocument();
  });

  it('collapses the overflow into a count badge', () => {
    renderBadges(['a', 'b', 'c', 'd', 'e', 'f']);

    expect(screen.getByTestId('thingHiddenCount')).toHaveTextContent('+2');
    expect(screen.queryByTestId('thing-e')).not.toBeInTheDocument();
  });

  it('names the hidden items on the count badge, for pointerless access', () => {
    renderBadges(['a', 'b', 'c', 'd', 'e', 'f']);

    expect(screen.getByTestId('thingHiddenCount')).toHaveAttribute('aria-label', '2 more: e, f');
  });

  it('shows every item when they fit', () => {
    renderBadges(['a', 'b', 'c', 'd']);

    expect(screen.queryByTestId('thingHiddenCount')).not.toBeInTheDocument();
  });

  it('takes the visible count from the caller', () => {
    renderBadges(['a', 'b', 'c'], 1);

    expect(screen.getByTestId('thingHiddenCount')).toHaveTextContent('+2');
  });

  // The count badge shares the badges' prefix, so it must not also match a `^prefix-` lookup or
  // callers reading "every badge" would count it as an item.
  it('keeps the count badge out of the item test-subj namespace', () => {
    renderBadges(['a', 'b', 'c', 'd', 'e']);

    expect(screen.getByTestId('thingHiddenCount')).toBeInTheDocument();
    expect(screen.queryByTestId('thing-hiddenCount')).not.toBeInTheDocument();
  });
});

describe('Labels', () => {
  it('collapses overflow into a count badge instead of a "View more" popover', () => {
    render(
      <IntlProvider locale="en">
        <Labels
          labels={['observability', 'streams', 'significant-events', 'discovery', 'triage']}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('agentBuilderLabelHiddenCount')).toHaveTextContent('+1');
    expect(screen.queryByTestId('agentBuilderLabelsViewMoreButton')).not.toBeInTheDocument();
  });
});
