/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TriggerModeSelector } from './trigger_mode_selector';
import { ChatTriggerMode } from '../../../../../../common/http_api/chat';

describe('TriggerModeSelector', () => {
  it('names the button after what it is for and the current mode', () => {
    render(
      <TriggerModeSelector triggerMode={ChatTriggerMode.Never} onTriggerModeChange={jest.fn()} />
    );

    expect(screen.getByTestId('agentBuilderTriggerModeSelectorButton')).toHaveAccessibleName(
      'Include or skip the agent, Skip agent'
    );
  });

  it('marks the current mode as the selected option', async () => {
    render(
      <TriggerModeSelector triggerMode={ChatTriggerMode.Never} onTriggerModeChange={jest.fn()} />
    );

    fireEvent.click(screen.getByTestId('agentBuilderTriggerModeSelectorButton'));

    expect(await screen.findByRole('option', { name: 'Skip agent' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('option', { name: 'Include agent' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('changes the mode and closes the popover when an option is picked', async () => {
    const onTriggerModeChange = jest.fn();
    render(
      <TriggerModeSelector
        triggerMode={ChatTriggerMode.Always}
        onTriggerModeChange={onTriggerModeChange}
      />
    );

    fireEvent.click(screen.getByTestId('agentBuilderTriggerModeSelectorButton'));
    fireEvent.click(await screen.findByTestId('agentBuilderTriggerModeOption-never'));

    expect(onTriggerModeChange).toHaveBeenCalledWith(ChatTriggerMode.Never);
    await waitFor(() =>
      expect(screen.queryByTestId('agentBuilderTriggerModeSelectorList')).not.toBeInTheDocument()
    );
  });
});
