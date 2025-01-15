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

describe('Slider Control', () => {
  it('should basically work', () => {
    render(
      <I18nProvider>
        <ControlSlider
          values={[0.1, 1]}
          currentValue={0.1}
          onChange={jest.fn()}
          data-test-subj="test-id"
        />
      </I18nProvider>
    );
    const input = screen.getByTestId('test-id') as HTMLInputElement;
    expect(input.value).toBe('0'); // index 0 of the values array
  });

  it('should fallback to 1 when the provided value is not present within the values', () => {
    render(
      <I18nProvider>
        <ControlSlider
          values={[0.1, 0.5, 1]}
          currentValue={2}
          onChange={jest.fn()}
          data-test-subj="test-id"
        />
      </I18nProvider>
    );
    const input = screen.getByTestId('test-id') as HTMLInputElement;
    expect(input.value).toBe('2'); // index 2 of the values array
  });
});
