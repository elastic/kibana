/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../../common/mock';
import { PauseReasonModal } from './pause_reason_modal';
import * as i18n from '../translations';

describe('PauseReasonModal', () => {
  const props = {
    statusLabel: 'On hold',
    caseCount: 1,
    reasons: ['Awaiting customer', 'Awaiting vendor'],
    onClose: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists the configured reasons and keeps confirm disabled until one is picked', async () => {
    renderWithTestingProviders(<PauseReasonModal {...props} />);

    expect(screen.getByTestId('pause-reason-modal')).toBeInTheDocument();
    expect(screen.getByText(i18n.PAUSE_REASON_MODAL_BODY('On hold'))).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Awaiting customer' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Awaiting vendor' })).toBeInTheDocument();
    expect(screen.getByTestId('pause-reason-modal-confirm')).toBeDisabled();
    expect(screen.getByTestId('pause-reason-modal-confirm')).toHaveTextContent(
      i18n.PAUSE_REASON_MODAL_CONFIRM('On hold')
    );
  });

  it('submits the picked reason', async () => {
    renderWithTestingProviders(<PauseReasonModal {...props} />);

    await userEvent.click(screen.getByRole('option', { name: 'Awaiting vendor' }));
    await userEvent.click(screen.getByTestId('pause-reason-modal-confirm'));

    expect(props.onSubmit).toHaveBeenCalledWith('Awaiting vendor');
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('closes without submitting on cancel', async () => {
    renderWithTestingProviders(<PauseReasonModal {...props} />);

    await userEvent.click(screen.getByTestId('pause-reason-modal-cancel'));

    expect(props.onClose).toHaveBeenCalled();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('switches to the plural copy for several cases', () => {
    renderWithTestingProviders(<PauseReasonModal {...props} caseCount={3} />);

    expect(screen.getByText(i18n.PAUSE_REASON_MODAL_BULK_BODY('On hold'))).toBeInTheDocument();
    expect(screen.getByTestId('pause-reason-modal-confirm')).toHaveTextContent(
      i18n.PAUSE_REASON_MODAL_CONFIRM_BULK('On hold', 3)
    );
  });
});
