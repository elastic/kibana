/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClosablePopoverTitle } from './closable_popover_title';

describe('closable popover title', () => {
  it('renders with defined options', () => {
    const onClose = jest.fn();
    const children = <div className="foo" />;
    render(<ClosablePopoverTitle onClose={onClose}>{children}</ClosablePopoverTitle>);

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    expect(document.querySelector('.foo')).toBeInTheDocument();
  });

  it('onClose function gets called', () => {
    const onClose = jest.fn();
    const children = <div className="foo" />;
    render(<ClosablePopoverTitle onClose={onClose}>{children}</ClosablePopoverTitle>);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });
});
