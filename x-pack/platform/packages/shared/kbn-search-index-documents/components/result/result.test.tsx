/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import '@testing-library/jest-dom';

import { Result } from './result';

const renderResult = (fieldCount: number) =>
  render(
    <I18nProvider>
      <Result
        metaData={{ id: 'doc-1' }}
        fields={Array.from({ length: fieldCount }, (_, index) => ({
          fieldName: `field_${index}`,
          fieldType: 'keyword',
          fieldValue: `value_${index}`,
        }))}
      />
    </I18nProvider>
  );

describe('Result expand tooltip', () => {
  it('offers expand and collapse when every field is already visible', async () => {
    const user = userEvent.setup();
    renderResult(3);

    await user.click(screen.getByRole('button', { name: 'Expand fields' }));

    expect(screen.getByRole('button', { name: 'Collapse fields' })).toBeInTheDocument();
  });

  it('counts hidden fields when there are more than the default', async () => {
    const user = userEvent.setup();
    renderResult(5);

    await user.click(screen.getByRole('button', { name: 'Show 2 more fields' }));

    expect(screen.getByRole('button', { name: 'Show 2 fewer fields' })).toBeInTheDocument();
  });
});
