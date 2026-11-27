/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';

import { renderWithTestingProviders } from '../../common/mock';
import { LinkIcon } from '.';

describe('LinkIcon', () => {
  const onClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders', () => {
    renderWithTestingProviders(
      <LinkIcon onClick={onClick} iconType="warning">
        {'Test link'}
      </LinkIcon>
    );

    expect(screen.getByRole('button', { name: 'Test link' })).toBeInTheDocument();
    expect(screen.getByText('Test link')).toBeInTheDocument();
  });

  test('it renders an action button when onClick is provided', () => {
    renderWithTestingProviders(
      <LinkIcon iconType="warning" onClick={onClick}>
        {'Test link'}
      </LinkIcon>
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('it renders an icon', () => {
    renderWithTestingProviders(
      <LinkIcon onClick={onClick} iconType="warning">
        {'Test link'}
      </LinkIcon>
    );

    expect(screen.getByRole('button')).toContainHTML('data-euiicon-type="warning"');
  });

  test('it positions the icon to the right when iconSide is right', () => {
    renderWithTestingProviders(
      <LinkIcon onClick={onClick} iconSide="right" iconType="warning">
        {'Test link'}
      </LinkIcon>
    );

    expect(screen.getByRole('button')).toHaveStyleRule('flex-direction', 'row-reverse');
  });

  test('it positions the icon to the left when iconSide is left (or not provided)', () => {
    renderWithTestingProviders(
      <LinkIcon onClick={onClick} iconSide="left" iconType="warning">
        {'Test link'}
      </LinkIcon>
    );

    expect(screen.getByRole('button')).not.toHaveStyleRule('flex-direction', 'row-reverse');
  });

  test('it renders a label', () => {
    renderWithTestingProviders(
      <LinkIcon onClick={onClick} iconType="warning">
        {'Test link'}
      </LinkIcon>
    );

    expect(screen.getByText('Test link')).toHaveClass('casesLinkIcon__label');
  });
});
