/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyApp } from './empty_app';

describe('the empty app', () => {
  it('says what to do and offers each way to begin, to someone who can edit', async () => {
    const onBuild = jest.fn();
    const onDescribe = jest.fn();
    const onUseExample = jest.fn();
    render(
      <EmptyApp canEdit onBuild={onBuild} onDescribe={onDescribe} onUseExample={onUseExample} />
    );

    expect(screen.getByRole('heading', { name: 'Build your app' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Describe it' }));
    await userEvent.click(screen.getByRole('button', { name: 'Build it yourself' }));
    await userEvent.click(screen.getByRole('button', { name: 'Start from an example' }));

    expect(onDescribe).toHaveBeenCalledTimes(1);
    expect(onBuild).toHaveBeenCalledTimes(1);
    expect(onUseExample).toHaveBeenCalledTimes(1);
  });

  it('does not offer to describe it when chat is not there, and then building is the main way', () => {
    render(<EmptyApp canEdit onBuild={jest.fn()} onUseExample={jest.fn()} />);

    expect(screen.queryByRole('button', { name: 'Describe it' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Build it yourself' })).toBeInTheDocument();
  });

  it('only says that it is empty to someone who cannot edit, with nothing to press', () => {
    render(
      <EmptyApp
        canEdit={false}
        onBuild={jest.fn()}
        onDescribe={jest.fn()}
        onUseExample={jest.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'This app is empty' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
