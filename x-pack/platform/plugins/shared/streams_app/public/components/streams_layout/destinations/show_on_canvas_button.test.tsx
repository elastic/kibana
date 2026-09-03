/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ShowOnCanvasButton } from './show_on_canvas_button';
import { SHOW_ON_CANVAS_BUTTON_LABEL } from './translations';

describe('ShowOnCanvasButton', () => {
  it('is enabled when the destination is on the canvas', () => {
    const onClick = jest.fn();
    render(
      <ShowOnCanvasButton
        destinationName="logs-nginx-default"
        isOnCanvas={true}
        onClick={onClick}
      />
    );

    const button = screen.getByTestId('streamsShowOnCanvasActionButton-logs-nginx-default');
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute('aria-label', SHOW_ON_CANVAS_BUTTON_LABEL);

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledWith('logs-nginx-default');
  });

  it('is disabled when the destination is not on the canvas', () => {
    const onClick = jest.fn();
    render(
      <ShowOnCanvasButton destinationName="logs-unlinked" isOnCanvas={false} onClick={onClick} />
    );

    const button = screen.getByTestId('streamsShowOnCanvasActionButton-logs-unlinked');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-label', SHOW_ON_CANVAS_BUTTON_LABEL);

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
