/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';

/**
 * Best-effort close for the common "View" filter popover.
 */
export const closeViewFilterPopoverIfOpen = async () => {
  const filterList = screen.queryByTestId('filterList');
  const viewButton = screen.queryByTestId('viewButton');

  if (!filterList || !viewButton) return;
  if (viewButton.getAttribute('aria-expanded') !== 'true') return;

  fireEvent.click(viewButton);
  await waitFor(() => {
    expect(viewButton).toHaveAttribute('aria-expanded', 'false');
  });
};
