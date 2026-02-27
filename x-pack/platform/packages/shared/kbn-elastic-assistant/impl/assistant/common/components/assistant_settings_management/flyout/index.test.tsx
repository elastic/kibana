/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiFlyout } from '@elastic/eui';
import { Flyout } from '.';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');

  return {
    ...actual,
    EuiFlyout: jest.fn(({ children }: { children: React.ReactNode }) => <div>{children}</div>),
  };
});

describe('Assistant settings flyout', () => {
  const requiredProps = {
    flyoutVisible: true,
    onClose: jest.fn(),
    onSaveCancelled: jest.fn(),
    onSaveConfirmed: jest.fn(),
  };

  beforeEach(() => {
    (EuiFlyout as unknown as jest.Mock).mockClear();
  });

  it('passes aria-label from the title to EuiFlyout', () => {
    const title = 'Edit system prompt';
    const mockedEuiFlyout = EuiFlyout as unknown as jest.Mock;
    render(
      <Flyout {...requiredProps} title={title}>
        <div>{'Body'}</div>
      </Flyout>
    );

    const firstCallProps = mockedEuiFlyout.mock.calls[0]?.[0];
    expect(firstCallProps?.['aria-label']).toBe(title);
  });

  it('does not pass aria-label when the title is missing', () => {
    const mockedEuiFlyout = EuiFlyout as unknown as jest.Mock;
    render(
      <Flyout {...requiredProps}>
        <div>{'Body'}</div>
      </Flyout>
    );

    const firstCallProps = mockedEuiFlyout.mock.calls[0]?.[0];
    expect(firstCallProps?.['aria-label']).toBeUndefined();
  });
});
