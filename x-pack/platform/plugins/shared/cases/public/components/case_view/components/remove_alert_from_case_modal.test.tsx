/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RemoveAlertFromCaseModal from './remove_alert_from_case_modal';
import { useRemoveAlertFromCase } from '../../../containers/use_remove_alert_from_case';

jest.mock('../../../containers/use_remove_alert_from_case');

const useRemoveAlertFromCaseMock = useRemoveAlertFromCase as jest.Mock;

let onClose = jest.fn();
let onSuccess = jest.fn();
let mutateAsync = jest.fn(() => Promise.resolve());

describe('RemoveAlertFromCaseModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onClose = jest.fn();
    onSuccess = jest.fn();
    mutateAsync = jest.fn(() => Promise.resolve());
    useRemoveAlertFromCaseMock.mockReturnValue({ mutateAsync });
  });

  it('renders modal with correct title and message', () => {
    render(
      <RemoveAlertFromCaseModal
        caseId="case-1"
        alertId={['alert-1', 'alert-2']}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
    expect(screen.getByText(/Remove alert from case/i)).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <RemoveAlertFromCaseModal
        caseId="case-1"
        alertId={['alert-1', 'alert-2']}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
    fireEvent.click(screen.getByText(/Cancel/i));
    expect(onClose).toHaveBeenCalled();
    expect(mutateAsync).toHaveBeenCalledTimes(0);
    expect(onSuccess).toHaveBeenCalledTimes(0);
  });

  it('calls onSuccess when remove button is clicked', async () => {
    render(
      <RemoveAlertFromCaseModal
        caseId="case-1"
        alertId={['alert-1', 'alert-2']}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
    fireEvent.click(screen.getByText('Remove'));
    expect(mutateAsync).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
