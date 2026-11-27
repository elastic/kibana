/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserActionMoveToReference } from './move_to_reference';

const outlineComment = jest.fn();
const props = {
  id: 'move-to-ref-id',
  outlineComment,
};

describe('UserActionMoveToReference ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('it renders', async () => {
    render(<UserActionMoveToReference {...props} />);

    expect(screen.getByTestId(`move-to-link-${props.id}`)).toBeInTheDocument();
  });

  it('calls outlineComment correctly', async () => {
    render(<UserActionMoveToReference {...props} />);

    await userEvent.click(screen.getByTestId(`move-to-link-${props.id}`));
    expect(outlineComment).toHaveBeenCalledWith(props.id);
  });
});
