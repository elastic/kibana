/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  StackAlertActionsCell,
  STACK_ALERT_ROW_ACTIONS_TEST_ID,
  REMOVE_STACK_ALERT_FROM_CASE_TEST_ID,
} from './stack_alert_actions_cell';

type Props = React.ComponentProps<typeof StackAlertActionsCell>;

const getProps = (overrides: Partial<Props> = {}): Props =>
  ({ alert: { _id: 'alert-1', _index: 'index-1' }, ...overrides } as unknown as Props);

describe('StackAlertActionsCell', () => {
  it('renders nothing without onRemoveFromCase', () => {
    render(<StackAlertActionsCell {...getProps()} />);

    expect(screen.queryByTestId(STACK_ALERT_ROW_ACTIONS_TEST_ID)).not.toBeInTheDocument();
  });

  it('removes the row alert from the case and closes the menu', async () => {
    const onRemoveFromCase = jest.fn();
    render(<StackAlertActionsCell {...getProps({ onRemoveFromCase })} />);

    await userEvent.click(screen.getByTestId(STACK_ALERT_ROW_ACTIONS_TEST_ID));
    const removeButton = await screen.findByTestId(REMOVE_STACK_ALERT_FROM_CASE_TEST_ID);
    await userEvent.click(removeButton);

    expect(onRemoveFromCase).toHaveBeenCalledWith('alert-1');
    await waitForElementToBeRemoved(removeButton);
  });
});
