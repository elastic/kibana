/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { QueryClientProviderProps } from '@tanstack/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// FIXME: adds inefficient boilerplate that should not be required. See https://github.com/elastic/kibana/issues/180725
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { render as reactRender } from '@testing-library/react';

import type { TriggersAndActionsUiServices } from '../..';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';

/* eslint-disable no-console */

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

export interface AppMockRenderer {
  render: UiRender;
  coreStart: TriggersAndActionsUiServices;
  queryClient: QueryClient;
  AppWrapper: FC<PropsWithChildren<unknown>>;
}

export const createAppMockRenderer = (options?: {
  queryClientContext?: QueryClientProviderProps['context'];
  additionalServices?: any;
}): AppMockRenderer => {
  const { queryClientContext, additionalServices } = options ?? {};
  const services = createStartServicesMock();
  const core = coreMock.createStart();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    /**
     * React query prints the errors in the console even though
     * all tests are passings. We turn them off for testing.
     */
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });

  const AppWrapper = React.memo<PropsWithChildren<unknown>>(({ children }) => (
    <I18nProvider>
      {core.rendering.addContext(
        <KibanaContextProvider services={{ ...services, ...additionalServices }}>
          <QueryClientProvider client={queryClient} context={queryClientContext}>
            {children}
          </QueryClientProvider>
        </KibanaContextProvider>
      )}
    </I18nProvider>
  ));

  AppWrapper.displayName = 'AppWrapper';

  const render: UiRender = (ui, _options) => {
    return reactRender(ui, {
      wrapper: AppWrapper,
      ..._options,
    });
  };

  return {
    coreStart: services,
    render,
    queryClient,
    AppWrapper,
  };
};

export const getJsDomPerformanceFix = () => {
  const originalGetComputedStyle = Object.assign({}, window.getComputedStyle);

  return {
    fix: () => {
      // The JSDOM implementation is too slow
      // Especially for dropdowns that try to position themselves
      // perf issue - https://github.com/jsdom/jsdom/issues/3234
      Object.defineProperty(window, 'getComputedStyle', {
        value: (el: HTMLElement) => {
          /**
           * This is based on the jsdom implementation of getComputedStyle
           * https://github.com/jsdom/jsdom/blob/9dae17bf0ad09042cfccd82e6a9d06d3a615d9f4/lib/jsdom/browser/Window.js#L779-L820
           *
           * It is missing global style parsing and will only return styles applied directly to an element.
           * Will not return styles that are global or from emotion
           */
          const declaration = new CSSStyleDeclaration();
          const { style } = el;

          Array.prototype.forEach.call(style, (property: string) => {
            declaration.setProperty(
              property,
              style.getPropertyValue(property),
              style.getPropertyPriority(property)
            );
          });

          return declaration;
        },
        configurable: true,
        writable: true,
      });
    },
    cleanup: () => {
      Object.defineProperty(window, 'getComputedStyle', originalGetComputedStyle);
    },
  };
};
