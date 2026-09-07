/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { getTagsOverflowLimits, TagsOverflowBadgeRow } from './tags_overflow_badge_row';

describe('getTagsOverflowLimits', () => {
  it('returns the full budget when there are no other badges', () => {
    expect(getTagsOverflowLimits(0)).toEqual({ overflowSize: 3, maxVisible: 2 });
  });

  it('reduces the budget by the number of non-tag badges already in the row', () => {
    expect(getTagsOverflowLimits(2)).toEqual({ overflowSize: 1, maxVisible: 0 });
  });

  it('clamps at zero once non-tag badges exceed the row budget', () => {
    expect(getTagsOverflowLimits(5)).toEqual({ overflowSize: 0, maxVisible: 0 });
  });
});

describe('TagsOverflowBadgeRow', () => {
  it('renders nothing when there are no tags', () => {
    const { container } = render(
      <I18nProvider>
        <TagsOverflowBadgeRow tags={[]} overflowSize={3} maxVisible={2} />
      </I18nProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders every tag individually and no overflow badge when below the threshold', () => {
    render(
      <I18nProvider>
        <TagsOverflowBadgeRow tags={['a', 'b', 'c']} overflowSize={3} maxVisible={2} />
      </I18nProvider>
    );

    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.getByText('c')).toBeInTheDocument();
    expect(screen.queryByTestId('tagsOverflowBadgeRowMoreBadge')).not.toBeInTheDocument();
  });

  it('collapses tags past maxVisible into a "+N" badge once above the threshold', () => {
    render(
      <I18nProvider>
        <TagsOverflowBadgeRow tags={['a', 'b', 'c', 'd']} overflowSize={3} maxVisible={2} />
      </I18nProvider>
    );

    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.queryByText('c')).not.toBeInTheDocument();
    expect(screen.queryByText('d')).not.toBeInTheDocument();
    expect(screen.getByTestId('tagsOverflowBadgeRowMoreBadge')).toHaveTextContent('+2');
  });

  it('collapses every tag into the overflow badge when maxVisible is 0', () => {
    render(
      <I18nProvider>
        <TagsOverflowBadgeRow tags={['a', 'b']} overflowSize={0} maxVisible={0} />
      </I18nProvider>
    );

    expect(screen.queryByText('a')).not.toBeInTheDocument();
    expect(screen.queryByText('b')).not.toBeInTheDocument();
    expect(screen.getByTestId('tagsOverflowBadgeRowMoreBadge')).toHaveTextContent('+2');
  });
});
