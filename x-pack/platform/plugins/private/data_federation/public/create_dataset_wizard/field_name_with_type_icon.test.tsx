/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FieldNameWithTypeIcon } from './field_name_with_type_icon';

describe('FieldNameWithTypeIcon', () => {
  it('renders the field name with a type token icon', () => {
    render(
      <EuiProvider>
        <FieldNameWithTypeIcon name="timestamp" type="date" />
      </EuiProvider>
    );

    expect(screen.getByText('timestamp')).toBeInTheDocument();
    const icon = screen.getByText('Date');
    expect(icon).toHaveAttribute('data-euiicon-type', 'tokenDate');
    expect(icon.closest('.kbnFieldIcon')?.className).toMatch(/euiToken-square-light/);
  });

  it('shows the field type in a tooltip when the icon is hovered', async () => {
    const user = userEvent.setup();

    render(
      <EuiProvider>
        <FieldNameWithTypeIcon name="timestamp" type="date" />
      </EuiProvider>
    );

    await user.hover(screen.getByText('Date'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Date');
  });

  it('renders only the field name when no type is provided', () => {
    render(
      <EuiProvider>
        <FieldNameWithTypeIcon name="timestamp" />
      </EuiProvider>
    );

    expect(screen.getByText('timestamp')).toBeInTheDocument();
    expect(screen.queryByText('Date')).not.toBeInTheDocument();
  });
});
