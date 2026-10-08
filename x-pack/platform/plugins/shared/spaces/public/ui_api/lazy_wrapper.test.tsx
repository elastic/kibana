/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';

import type { CoreStart, StartServicesAccessor } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';

import { LazyWrapper } from './lazy_wrapper';
import type { PluginsStart } from '../plugin';

interface GreetingProps {
  name: string;
}

const Greeting: FC<PropsWithChildren<GreetingProps>> = ({ name }) => <span>Hello {name}</span>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createStartServices() {
  const coreStart = coreMock.createStart();
  const startServices = deferred<[CoreStart, PluginsStart, unknown]>();
  const getStartServices: StartServicesAccessor<PluginsStart> = () => startServices.promise;
  const resolveStartServices = () => startServices.resolve([coreStart, {} as PluginsStart, {}]);
  return { coreStart, getStartServices, resolveStartServices };
}

describe('LazyWrapper', () => {
  it('renders nothing until start services resolve, then renders the loaded component with its props', async () => {
    const { getStartServices, resolveStartServices } = createStartServices();

    const { container } = render(
      <LazyWrapper
        fn={async () => Greeting}
        getStartServices={getStartServices}
        props={{ name: 'Ada' }}
      />
    );
    expect(container).toBeEmptyDOMElement();

    resolveStartServices();

    expect(await screen.findByText('Hello Ada')).toBeInTheDocument();
  });

  it('shows a loading spinner while the component loads', async () => {
    const { getStartServices, resolveStartServices } = createStartServices();
    const component = deferred<FC<PropsWithChildren<GreetingProps>>>();
    resolveStartServices();

    render(
      <LazyWrapper
        fn={() => component.promise}
        getStartServices={getStartServices}
        props={{ name: 'Ada' }}
      />
    );

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();

    component.resolve(Greeting);

    expect(await screen.findByText('Hello Ada')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders nothing while the component loads when the spinner is disabled', async () => {
    const { coreStart, getStartServices, resolveStartServices } = createStartServices();
    const component = deferred<FC<PropsWithChildren<GreetingProps>>>();
    const fn = jest.fn(() => component.promise);
    resolveStartServices();

    const { container } = render(
      <LazyWrapper
        fn={fn}
        getStartServices={getStartServices}
        showLoadingSpinner={false}
        props={{ name: 'Ada' }}
      />
    );

    // The loader only runs once start services have resolved and the lazy component renders.
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    expect(container).toBeEmptyDOMElement();

    component.resolve(Greeting);

    expect(await screen.findByText('Hello Ada')).toBeInTheDocument();
    expect(coreStart.notifications.toasts.addError).not.toHaveBeenCalled();
  });

  it('reports a failed load as an error toast and renders nothing', async () => {
    // React logs the error caught by the boundary; keep the test output clean.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { coreStart, getStartServices, resolveStartServices } = createStartServices();
      const error = new Error('chunk failed to load');
      const fn = (): Promise<FC<PropsWithChildren<GreetingProps>>> => Promise.reject(error);
      resolveStartServices();

      const { container } = render(
        <LazyWrapper fn={fn} getStartServices={getStartServices} props={{ name: 'Ada' }} />
      );

      await waitFor(() =>
        expect(coreStart.notifications.toasts.addError).toHaveBeenCalledWith(error, {
          title: 'Failed to load Kibana asset',
          toastMessage: 'Reload page to continue.',
        })
      );
      expect(container).toBeEmptyDOMElement();
    } finally {
      consoleError.mockRestore();
    }
  });
});
