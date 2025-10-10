/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { ClosablePopoverTitle } from './closable_popover_title';
import userEvent from '@testing-library/user-event';

describe('closable popover title', () => {
  it('renders with defined options', async () => {
    const onClose = jest.fn();
    const children = <div data-test-subj="data_test_subj" />;
    render(<ClosablePopoverTitle onClose={onClose}>{children}</ClosablePopoverTitle>);

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    expect(await screen.findByTestId('data_test_subj')).toBeInTheDocument();
  });

  it('onClose function gets called', async () => {
    const user = userEvent.setup();

    const onClose = jest.fn();
    const children = <div />;
    render(<ClosablePopoverTitle onClose={onClose}>{children}</ClosablePopoverTitle>);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });
});
