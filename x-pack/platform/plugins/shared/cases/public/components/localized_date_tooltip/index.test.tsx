/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import moment from 'moment-timezone';
import React from 'react';

import { LocalizedDateTooltip } from '.';
import { renderWithTestingProviders } from '../../common/mock';

describe('LocalizedDateTooltip', () => {
  beforeEach(() => {
    moment.tz.setDefault('UTC');
  });
  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  moment.locale('en');
  const date = moment('2019-02-19 04:21:00');

  const sampleContentText =
    'this content is typically the string representation of the date prop, but can be any valid react child';

  const SampleContent = () => <span data-test-subj="sample-content">{sampleContentText}</span>;

  test('it renders the child content', () => {
    renderWithTestingProviders(
      <LocalizedDateTooltip date={date.toDate()}>
        <SampleContent />
      </LocalizedDateTooltip>
    );

    expect(screen.getByTestId('sample-content')).toBeInTheDocument();
    expect(screen.getByText(sampleContentText)).toBeInTheDocument();
  });

  test('it renders the localized date in the tooltip on hover', async () => {
    renderWithTestingProviders(
      <LocalizedDateTooltip date={date.toDate()}>
        <SampleContent />
      </LocalizedDateTooltip>
    );

    await userEvent.hover(screen.getByTestId('sample-content'));

    expect(await screen.findByTestId('dates-container')).toBeInTheDocument();
    expect(await screen.findByTestId('with-day-of-week')).toHaveTextContent(/Tue, Feb 19, 2019/);
  });
});
