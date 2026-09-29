/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { EuiFlyout } from '@elastic/eui';
import { Flyout } from '.';

vi.mock('@elastic/eui', async () => {
  const actual = (await vi.importActual('@elastic/eui'));

  return {
    ...actual,
    EuiFlyout: vi.fn(({ children }: { children: React.ReactNode }) => <div>{children}</div>),
  };
});

describe('Assistant settings flyout', () => {
  const requiredProps = {
    flyoutVisible: true,
    onClose: vi.fn(),
    onSaveCancelled: vi.fn(),
    onSaveConfirmed: vi.fn(),
  };

  beforeEach(() => {
    (EuiFlyout as unknown as Mock).mockClear();
  });

  it('passes aria-label from the title to EuiFlyout', () => {
    const title = 'Edit system prompt';
    const mockedEuiFlyout = EuiFlyout as unknown as Mock;
    render(
      <Flyout {...requiredProps} title={title}>
        <div>{'Body'}</div>
      </Flyout>
    );

    const firstCallProps = mockedEuiFlyout.mock.calls[0]?.[0];
    expect(firstCallProps?.['aria-label']).toBe(title);
  });

  it('does not pass aria-label when the title is missing', () => {
    const mockedEuiFlyout = EuiFlyout as unknown as Mock;
    render(
      <Flyout {...requiredProps}>
        <div>{'Body'}</div>
      </Flyout>
    );

    const firstCallProps = mockedEuiFlyout.mock.calls[0]?.[0];
    expect(firstCallProps?.['aria-label']).toBeUndefined();
  });
});
