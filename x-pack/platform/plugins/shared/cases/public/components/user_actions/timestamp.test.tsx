/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithTestingProviders } from '../../common/mock';
import { UserActionTimestamp } from './timestamp';

jest.mock('@kbn/i18n-react', () => {
  const { i18n } = jest.requireActual('@kbn/i18n');
  i18n.init({ locale: 'en' });

  const originalModule = jest.requireActual('@kbn/i18n-react');
  const { createElement } = jest.requireActual('react');
  const FormattedRelative = jest.fn((props: { 'data-test-subj'?: string; value: string }) =>
    createElement(
      'span',
      { 'data-test-subj': props['data-test-subj'] },
      props.value === '2020-09-06T14:40:59.889Z' ? '2 days ago' : '20 hours ago'
    )
  );

  return {
    ...originalModule,
    FormattedRelative,
  };
});

const props = {
  createdAt: '2020-09-06T14:40:59.889Z',
  updatedAt: '2020-09-07T14:40:59.889Z',
};

describe('UserActionTimestamp ', () => {
  it('it renders', async () => {
    renderWithTestingProviders(<UserActionTimestamp {...props} />);

    expect(screen.getByTestId('user-action-title-creation-relative-time')).toBeInTheDocument();
    expect(screen.getByTestId('user-action-title-edited-relative-time')).toBeInTheDocument();
  });

  it('it shows only the created time when the updated time is missing', async () => {
    renderWithTestingProviders(<UserActionTimestamp createdAt="2020-09-06T14:40:59.889Z" />);

    expect(screen.getByTestId('user-action-title-creation-relative-time')).toBeInTheDocument();
    expect(screen.queryByTestId('user-action-title-edited-relative-time')).not.toBeInTheDocument();
  });

  it('it shows the timestamp correctly', async () => {
    renderWithTestingProviders(<UserActionTimestamp {...props} />);

    const createdText = screen.getByTestId('user-action-title-creation-relative-time').textContent;
    const updatedText = screen.getByTestId('user-action-title-edited-relative-time').textContent;

    expect(`${createdText} (${updatedText})`).toBe('2 days ago (20 hours ago)');
  });
});
