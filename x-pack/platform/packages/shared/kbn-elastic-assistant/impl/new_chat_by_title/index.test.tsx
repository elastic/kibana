/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BUTTON_ICON_TEST_ID, BUTTON_TEST_ID, BUTTON_TEXT_TEST_ID, NewChatByTitle } from '.';

const testProps = {
  showAssistantOverlay: jest.fn(),
};

describe('NewChatByTitle', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render icon only by default', () => {
    const { getByTestId, queryByTestId } = render(<NewChatByTitle {...testProps} />);

    expect(getByTestId(BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(BUTTON_ICON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(BUTTON_TEXT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render the button with icon and text', () => {
    const { getByTestId } = render(<NewChatByTitle {...testProps} text={'Ask AI Assistant'} />);

    expect(getByTestId(BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(BUTTON_ICON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(BUTTON_TEXT_TEST_ID)).toHaveTextContent('Ask AI Assistant');
  });

  it('calls showAssistantOverlay on click', async () => {
    const { getByTestId } = render(<NewChatByTitle {...testProps} />);

    const button = getByTestId(BUTTON_TEST_ID);

    await userEvent.click(button);

    expect(testProps.showAssistantOverlay).toHaveBeenCalledWith(true);
  });
});
