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
import { RemoveSelectedAttachments } from './remove_selected_attachments';

describe('RemoveSelectedAttachments', () => {
  it('renders nothing with no selection', () => {
    renderWithTestingProviders(<RemoveSelectedAttachments count={0} onRemove={jest.fn()} />);

    expect(screen.queryByTestId('cases-attachments-selected-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cases-attachments-remove-selected')).not.toBeInTheDocument();
  });

  it('renders the selected count and calls onRemove', async () => {
    const onRemove = jest.fn();
    renderWithTestingProviders(<RemoveSelectedAttachments count={3} onRemove={onRemove} />);

    expect(screen.getByTestId('cases-attachments-selected-count')).toHaveTextContent('3 selected');

    await userEvent.click(screen.getByTestId('cases-attachments-remove-selected'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('disables the button while removing', () => {
    renderWithTestingProviders(
      <RemoveSelectedAttachments count={3} onRemove={jest.fn()} isRemoving />
    );

    expect(screen.getByTestId('cases-attachments-remove-selected')).toBeDisabled();
  });
});
