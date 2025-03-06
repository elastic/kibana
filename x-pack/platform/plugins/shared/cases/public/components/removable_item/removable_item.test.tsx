/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppMockRenderer } from '../../common/mock';
import { noUpdateCasesPermissions, createAppMockRenderer } from '../../common/mock';
import { fireEvent, screen } from '@testing-library/react';
import { RemovableItem } from './removable_item';
import userEvent from '@testing-library/user-event';

const MockComponent = () => {
  return <span>{'My component'}</span>;
};

describe('UserRepresentation', () => {
  let appMockRender: AppMockRenderer;

  const onRemoveItem = jest.fn();

  const defaultProps = {
    tooltipContent: 'Remove item',
    buttonAriaLabel: 'Remove item',
    onRemoveItem,
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('does not show the cross button when the user is not hovering over the row', () => {
    appMockRender.render(
      <RemovableItem {...defaultProps}>
        <MockComponent />
      </RemovableItem>
    );

    expect(screen.queryByTestId('remove-button')).toHaveStyle('opacity: 0');
  });

  it('show the cross button when the user is hovering over the row', () => {
    appMockRender.render(
      <RemovableItem {...defaultProps}>
        <MockComponent />
      </RemovableItem>
    );

    fireEvent.mouseEnter(screen.getByTestId('remove-group'));

    expect(screen.getByTestId('remove-button')).toHaveStyle('opacity: 1');
  });

  it('shows and then removes the cross button when the user hovers and removes the mouse from over the row', () => {
    appMockRender.render(
      <RemovableItem {...defaultProps}>
        <MockComponent />
      </RemovableItem>
    );

    fireEvent.mouseEnter(screen.getByTestId('remove-group'));
    expect(screen.getByTestId('remove-button')).toHaveStyle('opacity: 1');

    fireEvent.mouseLeave(screen.getByTestId('remove-group'));
    expect(screen.queryByTestId('remove-button')).toHaveStyle('opacity: 0');
  });

  it('does not show the cross button when the user is hovering over the row and does not have update permissions', () => {
    appMockRender = createAppMockRenderer({ permissions: noUpdateCasesPermissions() });
    appMockRender.render(
      <RemovableItem {...defaultProps}>
        <MockComponent />
      </RemovableItem>
    );

    fireEvent.mouseEnter(screen.getByTestId('remove-group'));

    expect(screen.queryByTestId('remove-button')).not.toBeInTheDocument();
  });

  it('call onRemoveItem correctly', async () => {
    appMockRender.render(
      <RemovableItem {...defaultProps}>
        <MockComponent />
      </RemovableItem>
    );

    await userEvent.click(screen.getByTestId('remove-button'));

    expect(onRemoveItem).toBeCalled();
  });

  it('sets the dataTestSubjPrefix correctly', () => {
    appMockRender.render(
      <RemovableItem {...defaultProps} dataTestSubjPrefix={'my-prefix'}>
        <MockComponent />
      </RemovableItem>
    );

    expect(screen.getByTestId('my-prefix-remove-group')).toBeInTheDocument();
    expect(screen.getByTestId('my-prefix-remove-button')).toBeInTheDocument();
  });
});
