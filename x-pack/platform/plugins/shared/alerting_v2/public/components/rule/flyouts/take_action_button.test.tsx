/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { TakeActionButton } from './take_action_button';

const renderButton = (props: Partial<React.ComponentProps<typeof TakeActionButton>> = {}) =>
  render(
    <I18nProvider>
      <TakeActionButton isOpen={false} onClick={jest.fn()} {...props} />
    </I18nProvider>
  );

describe('TakeActionButton', () => {
  it('shows an up arrow when the menu is closed', () => {
    const { container } = renderButton({ isOpen: false });

    expect(container.querySelector('[data-euiicon-type="arrowUp"]')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="arrowDown"]')).not.toBeInTheDocument();
  });

  it('shows a down arrow when the menu is open', () => {
    const { container } = renderButton({ isOpen: true });

    expect(container.querySelector('[data-euiicon-type="arrowDown"]')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="arrowUp"]')).not.toBeInTheDocument();
  });

  it('calls onClick when pressed', () => {
    const onClick = jest.fn();
    renderButton({ onClick });

    fireEvent.click(screen.getByTestId('ruleSummaryFlyoutTakeActionButton'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
