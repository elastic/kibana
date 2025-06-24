/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { ControlSlider } from '.';

const values = [
  {
    label: '.001%',
    value: 0.00001,
    accessibleLabel: 'Point zero zero one percent, most performant',
  },
  {
    label: '.01%',
    value: 0.0001,
  },
  {
    label: '.1%',
    value: 0.001,
  },
  {
    label: '1%',
    value: 0.01,
  },
  {
    label: '10%',
    value: 0.1,
  },
  {
    label: '100%',
    value: 1,
    accessibleLabel: 'One hundred percent, most accurate',
  },
];

describe('Slider Control', () => {
  it('should basically work', () => {
    render(
      <I18nProvider>
        <ControlSlider
          values={values}
          currentValue={0.00001}
          onChange={jest.fn()}
          data-test-subj="test-id"
        />
      </I18nProvider>
    );
    const input = screen.getByTestId('test-id') as HTMLInputElement;
    expect(input.value).toBe('0'); // index 0 of the values array
  });

  it('should display accessible label when provided', () => {
    render(
      <I18nProvider>
        <ControlSlider
          values={values}
          currentValue={0.00001}
          onChange={jest.fn()}
          data-test-subj="test-id"
        />
      </I18nProvider>
    );
    const input = screen.getByTestId('test-id') as HTMLInputElement;
    expect(input.getAttribute('aria-valuetext')).toBe(
      '0, (Point zero zero one percent, most performant)'
    );
  });

  it('should fallback to 1 when the provided value is not present within the values', () => {
    render(
      <I18nProvider>
        <ControlSlider
          values={values}
          currentValue={4}
          onChange={jest.fn()}
          data-test-subj="test-id"
        />
      </I18nProvider>
    );
    const input = screen.getByTestId('test-id') as HTMLInputElement;
    expect(input.value).toBe('5'); // index 5 of the values array
  });
});
