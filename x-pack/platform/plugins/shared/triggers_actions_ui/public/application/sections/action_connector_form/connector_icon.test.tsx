/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { act, screen } from '@testing-library/react';
import type { AppMockRenderer } from '../test_utils';
import { createAppMockRenderer } from '../test_utils';
import { ConnectorIcon } from './connector_icon';

// Jest resolves @elastic/eui to test-env, whose EuiIcon ignores component types.
// Production EuiIcon renders them, so a lazy icon suspends. Mirror that here.
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const ReactActual = jest.requireActual('react');

  const EuiIcon = ({
    type,
    className,
    ...rest
  }: {
    type?: unknown;
    className?: string;
    [key: string]: unknown;
  }) => {
    const classes = ['euiIcon', className].filter(Boolean).join(' ');
    if (typeof type === 'string' || type == null) {
      return ReactActual.createElement('span', {
        ...rest,
        className: classes,
        'data-euiicon-type': type,
      });
    }
    return ReactActual.createElement(type as React.ElementType, { ...rest, className: classes });
  };

  return {
    ...actual,
    EuiIcon,
  };
});

const ResolvedIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />;

describe('ConnectorIcon', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
  });

  it('renders an EuiIcon and no skeleton for a string type', () => {
    appMockRenderer.render(<ConnectorIcon type="test" data-test-subj="connector-icon" />);

    expect(screen.getByTestId('connector-icon')).toHaveClass('euiIcon');
    expect(document.querySelector('.euiSkeletonCircle')).toBeNull();
  });

  it('shows a skeleton for a lazy type, then the icon, without an outer fallback', async () => {
    let resolveIcon: (value: { default: typeof ResolvedIcon }) => void = () => undefined;
    const deferred = new Promise<{ default: typeof ResolvedIcon }>((resolve) => {
      resolveIcon = resolve;
    });
    const lazyIcon = lazy(() => deferred);

    appMockRenderer.render(
      <Suspense fallback={<div data-test-subj="outer-fallback" />}>
        <ConnectorIcon type={lazyIcon} data-test-subj="connector-icon" />
      </Suspense>
    );

    expect(document.querySelector('.euiSkeletonCircle')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('outer-fallback')).not.toBeInTheDocument();

    await act(async () => {
      resolveIcon({ default: ResolvedIcon });
    });

    expect(await screen.findByTestId('connector-icon')).toHaveClass('euiIcon');
    expect(document.querySelector('.euiSkeletonCircle')).toBeNull();
    expect(screen.queryByTestId('outer-fallback')).not.toBeInTheDocument();
  });
});
