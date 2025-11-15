/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';

const jsonSelector = 'policyRequestJson';

export const createRequestFlyoutActions = () => {
  const openRequestFlyout = async () => {
    fireEvent.click(screen.getByTestId('requestButton'));
    // Wait for flyout to appear
    await waitFor(() => {
      expect(
        screen.queryByTestId(jsonSelector) || screen.queryByTestId('policyRequestInvalidAlert')
      ).toBeInTheDocument();
    });
  };
  const closeRequestFlyout = () => {
    fireEvent.click(screen.getByTestId('policyRequestClose'));
  };
  return {
    openRequestFlyout,
    closeRequestFlyout,
    hasRequestJson: () => Boolean(screen.queryByTestId(jsonSelector)),
    getRequestJson: () => screen.getByTestId(jsonSelector).textContent || '',
    hasInvalidPolicyAlert: () => Boolean(screen.queryByTestId('policyRequestInvalidAlert')),
  };
};
