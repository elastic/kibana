/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { SearchMemberMatchDescription } from './search_member_match_description';

const renderDescription = (memberTitles: string[]) =>
  render(
    <I18nProvider>
      <div data-test-subj="host">
        <SearchMemberMatchDescription memberTitles={memberTitles} collectionTitle="AWS" />
      </div>
    </I18nProvider>
  );

describe('SearchMemberMatchDescription', () => {
  it('uses the singular verb for one service', () => {
    const { container } = renderDescription(['Amazon GuardDuty']);
    expect(container).toHaveTextContent('Amazon GuardDuty is part of the AWS collection.');
  });

  it('joins several services and uses the plural verb', () => {
    const { container } = renderDescription(['A', 'B', 'C']);
    expect(container).toHaveTextContent('A, B, and C are part of the AWS collection.');
  });

  it('counts the services beyond the third and leaves the count unbolded', () => {
    const { container, getByText } = renderDescription(['A', 'B', 'C', 'D', 'E']);
    expect(container).toHaveTextContent('A, B, C, and 2 more are part of the AWS collection.');
    expect(getByText('C').tagName).toBe('STRONG');
    expect(container.querySelectorAll('strong')).toHaveLength(3);
  });

  // The card clamps its description with `display: -webkit-box`, so anything but a single
  // child would be laid out as separate boxes.
  it('renders as a single child of its container', () => {
    const { getByTestId } = render(
      <I18nProvider>
        <div data-test-subj="host">
          <SearchMemberMatchDescription memberTitles={['A', 'B']} collectionTitle="AWS" />
        </div>
      </I18nProvider>
    );
    expect(getByTestId('host').children).toHaveLength(1);
  });
});
