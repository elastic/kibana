/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { StatusToggle } from './status_toggle';

const openPopover = () => fireEvent.click(screen.getByTestId('statusToggle'));

describe('StatusToggle', () => {
  it('lists Open and Closed, with the current status active', () => {
    renderWithKibanaRenderContext(<StatusToggle status="open" onChange={jest.fn()} />);
    openPopover();

    expect(screen.getByTestId('statusToggleOpen')).toHaveTextContent('Open');
    expect(screen.getByTestId('statusToggleClosed')).toHaveTextContent('Closed');
    expect(screen.getByTestId('statusToggleOpen')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('statusToggleClosed')).not.toHaveAttribute('aria-current');
  });

  it('defaults to open when no status is given', () => {
    renderWithKibanaRenderContext(<StatusToggle onChange={jest.fn()} />);
    openPopover();

    expect(screen.getByTestId('statusToggleOpen')).toHaveAttribute('aria-current', 'true');
  });

  it('calls onChange with the other status and closes the popover', async () => {
    const onChange = jest.fn();
    renderWithKibanaRenderContext(<StatusToggle status="open" onChange={onChange} />);
    openPopover();

    fireEvent.click(screen.getByTestId('statusToggleClosed'));

    expect(onChange).toHaveBeenCalledWith('closed');
    await waitFor(() => expect(screen.queryByTestId('statusToggleClosed')).not.toBeInTheDocument());
  });

  it('only closes the popover when the current status is picked', async () => {
    const onChange = jest.fn();
    renderWithKibanaRenderContext(<StatusToggle status="closed" onChange={onChange} />);
    openPopover();

    fireEvent.click(screen.getByTestId('statusToggleClosed'));

    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId('statusToggleOpen')).not.toBeInTheDocument());
  });

  it('renders a plain badge when disabled', () => {
    renderWithKibanaRenderContext(<StatusToggle status="open" onChange={jest.fn()} isDisabled />);

    expect(screen.getByTestId('statusToggle')).toHaveTextContent('Open');
    openPopover();
    expect(screen.queryByTestId('statusToggleOpen')).not.toBeInTheDocument();
  });
});
