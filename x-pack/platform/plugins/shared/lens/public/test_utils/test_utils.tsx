/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { RenderOptions, render } from '@testing-library/react';
import { ComponentType, MountRendererProps, mount } from 'enzyme';
import React from 'react';
import { PropsWithChildren, ReactElement } from 'react';

export const renderWithProviders = (
  ui: ReactElement,
  renderOptions?: RenderOptions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  const { wrapper, ...options } = renderOptions || {};

  const CustomWrapper = wrapper as React.ComponentType<React.PropsWithChildren<{}>>;

  const Wrapper: React.FC<PropsWithChildren<{}>> = ({ children }) => {
    return (
      <I18nProvider>
        <EuiThemeProvider>
          {wrapper ? <CustomWrapper>{children}</CustomWrapper> : children}
        </EuiThemeProvider>
      </I18nProvider>
    );
  };

  const rtlRender = render(ui, { wrapper: Wrapper, ...options });

  return rtlRender;
};

export const mountWithProviders = (component: React.ReactElement, options?: MountRendererProps) => {
  const { wrappingComponent, wrappingComponentProps } = options || {};

  const WrappingComponent = wrappingComponent as React.ComponentType<React.PropsWithChildren<{}>>;

  const wrapper: React.FC<PropsWithChildren<{}>> = ({ children }) => (
    <I18nProvider>
      <EuiThemeProvider>
        {WrappingComponent ? (
          <WrappingComponent {...wrappingComponentProps}>{children}</WrappingComponent>
        ) : (
          children
        )}
      </EuiThemeProvider>
    </I18nProvider>
  );

  const instance = mount(component, {
    ...options,
    wrappingComponent: wrapper as ComponentType<PropsWithChildren<{}>>,
  });
  return instance;
};
