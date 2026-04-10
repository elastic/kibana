/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertEpisodeTagsMenuItem } from './tags_action_button';

describe('AlertEpisodeTagsMenuItem', () => {
  it('calls onOpen when the menu item is clicked', async () => {
    const user = userEvent.setup();
    const onOpen = jest.fn();
    render(<AlertEpisodeTagsMenuItem isDisabled={false} onOpen={onOpen} />);

    expect(screen.getByText('Edit Tags')).toBeInTheDocument();

    await user.click(screen.getByTestId('alertingEpisodeActionsTagsButton'));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
