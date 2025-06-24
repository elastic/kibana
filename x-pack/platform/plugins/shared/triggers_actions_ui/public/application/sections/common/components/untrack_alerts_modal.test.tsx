/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { UntrackAlertsModal } from './untrack_alerts_modal';

const onConfirmMock = jest.fn();

const onCancelMock = jest.fn();

describe('Untrack alerts modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<UntrackAlertsModal onCancel={onCancelMock} onConfirm={onConfirmMock} />);

    expect(screen.getByTestId('untrackAlertsModal')).toBeInTheDocument();
  });

  it('should track alerts', () => {
    render(<UntrackAlertsModal onCancel={onCancelMock} onConfirm={onConfirmMock} />);

    fireEvent.click(screen.getByTestId('untrackAlertsModalSwitch'));

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(onConfirmMock).toHaveBeenCalledWith(true);
  });

  it('should untrack alerts', () => {
    render(<UntrackAlertsModal onCancel={onCancelMock} onConfirm={onConfirmMock} />);

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(onConfirmMock).toHaveBeenCalledWith(false);
  });

  it('should close if cancel is clicked', () => {
    render(<UntrackAlertsModal onCancel={onCancelMock} onConfirm={onConfirmMock} />);

    fireEvent.click(screen.getByTestId('confirmModalCancelButton'));

    expect(onCancelMock).toHaveBeenCalled();
  });
});
