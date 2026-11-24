/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { SaveAndApplyButton } from './save_and_apply_button';

const EXPLANATION = 'Create, update or cancel the processor you are editing first.';

const renderButton = (props: Partial<React.ComponentProps<typeof SaveAndApplyButton>> = {}) => {
  const onClick = jest.fn();
  render(
    <EuiProvider>
      <SaveAndApplyButton
        isSaving={false}
        isDisabled={false}
        isEditing={false}
        onClick={onClick}
        {...props}
      />
    </EuiProvider>
  );
  return { onClick, button: screen.getByTestId('streamsProcessingFlyoutSave') };
};

describe('SaveAndApplyButton', () => {
  it('saves when there is something to save', async () => {
    const { onClick, button } = renderButton();

    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('explains that the processor being edited has to be finished first', async () => {
    const { button } = renderButton({ isDisabled: true, isEditing: true });

    // Disabled for assistive technology, but still focusable so the explanation is reachable.
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button).not.toBeDisabled();

    await userEvent.tab();
    expect(button).toHaveFocus();
    expect(await screen.findByText(EXPLANATION)).toBeTruthy();
  });

  it('shows the explanation on hover too, and does not save when clicked', async () => {
    const { onClick, button } = renderButton({ isDisabled: true, isEditing: true });

    // Pointer events are off on the button; the tooltip listens on the anchor around it.
    fireEvent.mouseOver(button.parentElement ?? button);
    expect(await screen.findByText(EXPLANATION)).toBeTruthy();

    // Pointer events are off on the button, so the click is dispatched directly.
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('gives no explanation when it is disabled for another reason', async () => {
    const { button } = renderButton({ isDisabled: true });

    expect(button).toBeDisabled();
    // A disabled button takes no pointer events; the tooltip listens on the anchor around it.
    fireEvent.mouseOver(button.parentElement ?? button);
    await waitFor(() => expect(screen.queryByText(EXPLANATION)).toBeNull());
  });
});
