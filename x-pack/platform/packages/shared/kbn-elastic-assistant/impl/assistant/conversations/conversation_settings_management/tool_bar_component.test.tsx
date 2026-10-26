/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from './tool_bar_component';
import * as i18n from './translations';

describe('Toolbar', () => {
  const setup = (propsOverrides = {}) => {
    const props = {
      onConversationsBulkDeleted: jest.fn(),
      handleSelectAll: jest.fn(),
      handleUnselectAll: jest.fn(),
      totalConversations: 10,
      totalSelected: 0,
      isDeleteAll: false,
      ...propsOverrides,
    };

    render(<Toolbar {...props} />);
    return props;
  };

  it('renders nothing if totalConversations is 0', () => {
    const { container } = render(
      <Toolbar
        onConversationsBulkDeleted={jest.fn()}
        handleSelectAll={jest.fn()}
        handleUnselectAll={jest.fn()}
        totalConversations={0}
        totalSelected={0}
        isDeleteAll={false}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders select all button when isDeleteAll is false', () => {
    setup({ isDeleteAll: false });
    expect(screen.getByTestId('selectAllConversations')).toBeInTheDocument();
    expect(screen.getByText(i18n.SELECT_ALL_CONVERSATIONS(10))).toBeInTheDocument();
  });

  it('calls handleSelectAll on select all button click', () => {
    const props = setup({ isDeleteAll: false });
    fireEvent.click(screen.getByTestId('selectAllConversations'));
    expect(props.handleSelectAll).toHaveBeenCalledWith(10);
  });

  it('renders selected count when totalSelected is greater than 0', () => {
    setup({ totalSelected: 3 });
    expect(screen.getByTestId('selectedFields')).toHaveTextContent(i18n.SELECTED_CONVERSATIONS(3));
  });

  it('renders unselect all buttons when totalSelected is greater than 0', () => {
    setup({ totalSelected: 3 });
    expect(screen.getByTestId('unselectAllConversations')).toHaveTextContent(
      i18n.UNSELECT_ALL_CONVERSATIONS(3)
    );
  });

  it('renders unselect all and delete buttons when isDeleteAll is true', () => {
    setup({ isDeleteAll: true, totalSelected: 10 });
    expect(screen.getByTestId('unselectAllConversations')).toHaveTextContent(
      i18n.UNSELECT_ALL_CONVERSATIONS(10)
    );
    expect(screen.getByTestId('selectedFields')).toHaveTextContent(i18n.SELECTED_CONVERSATIONS(10));
    expect(screen.getByText(i18n.DELETE_SELECTED_CONVERSATIONS)).toBeInTheDocument();
  });

  it('calls handleUnselectAll on click', () => {
    const props = setup({ totalSelected: 2 });
    fireEvent.click(screen.getByTestId('unselectAllConversations'));
    expect(props.handleUnselectAll).toHaveBeenCalled();
  });

  it('calls onConversationsBulkDeleted on delete click', () => {
    const props = setup({ totalSelected: 5 });
    fireEvent.click(screen.getByText(i18n.DELETE_SELECTED_CONVERSATIONS));
    expect(props.onConversationsBulkDeleted).toHaveBeenCalled();
  });
});
