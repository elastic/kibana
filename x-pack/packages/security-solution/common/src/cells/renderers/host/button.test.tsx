/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HostDetailsButton } from './button';
import { render, screen } from '@testing-library/react';

const onClickMock = jest.fn();
const TestComponent = () => {
  return <HostDetailsButton onClick={onClickMock}>{'Test'}</HostDetailsButton>;
};

describe('Host Button', () => {
  it('should render as button with link formatting', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('host-details-button')).toBeVisible();
    expect(screen.getByTestId('host-details-button')).toHaveAttribute('type', 'button');
    expect(screen.getByTestId('host-details-button')).toHaveClass('euiLink');
  });

  it('should perform onClick Correctly', () => {
    render(<TestComponent />);
    screen.getByTestId('host-details-button').click();
    expect(onClickMock).toHaveBeenCalled();
  });
});
