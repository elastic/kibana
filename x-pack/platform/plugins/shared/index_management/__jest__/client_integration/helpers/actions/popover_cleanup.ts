/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';

/**
 * Best-effort close for the common "View" filter popover.
 *
 * - This helper encodes a deterministic close mechanism for a known popover (toggle by viewButton
 *   and panel state represented by filterList + data-popover-open).
 */
export const closeViewFilterPopoverIfOpen = async () => {
  const filterList = screen.queryByTestId('filterList');
  const viewButton = screen.queryByTestId('viewButton');

  if (!filterList || !viewButton) return;
  if (filterList.getAttribute('data-popover-open') !== 'true') return;

  fireEvent.click(viewButton);
  await waitFor(() => {
    expect(screen.queryByTestId('filterList')?.getAttribute('data-popover-open')).not.toBe('true');
  });
};
