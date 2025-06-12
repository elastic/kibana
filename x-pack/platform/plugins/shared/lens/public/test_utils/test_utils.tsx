/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RenderOptions, render } from '@testing-library/react';
import { ComponentType, MountRendererProps, mount } from 'enzyme';
import React from 'react';
import { PropsWithChildren, ReactElement } from 'react';
import { LensAppServices } from '../app_plugin/types';

export const renderWithProviders = (
  ui: ReactElement,
  renderOptions?: RenderOptions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  const { wrapper, ...options } = renderOptions || {};

  const CustomWrapper = wrapper as React.ComponentType<React.PropsWithChildren<{}>>;

  const Wrapper: React.FC<PropsWithChildren<{}>> = ({ children }) => {
    return (
      <KibanaContextProvider services={coreMock.createStart() as unknown as LensAppServices}>
        <I18nProvider>
          <EuiThemeProvider>
            {wrapper ? <CustomWrapper>{children}</CustomWrapper> : children}
          </EuiThemeProvider>
        </I18nProvider>
      </KibanaContextProvider>
    );
  };

  const rtlRender = render(ui, { wrapper: Wrapper, ...options });

  return rtlRender;
};

// legacy enzyme usage: remove when all tests are migrated to @testing-library/react
export const mountWithProviders = (component: React.ReactElement, options?: MountRendererProps) => {
  const { wrappingComponent, wrappingComponentProps } = options || {};

  const WrappingComponent = wrappingComponent as React.ComponentType<React.PropsWithChildren<{}>>;

  const wrapper: React.FC<PropsWithChildren<{}>> = ({ children }) => (
    <KibanaContextProvider services={coreMock.createStart() as unknown as LensAppServices}>
      <I18nProvider>
        <EuiThemeProvider>
          {WrappingComponent ? (
            <WrappingComponent {...wrappingComponentProps}>{children}</WrappingComponent>
          ) : (
            children
          )}
        </EuiThemeProvider>
      </I18nProvider>
    </KibanaContextProvider>
  );

  const instance = mount(component, {
    ...options,
    wrappingComponent: wrapper as ComponentType<PropsWithChildren<{}>>,
  });
  return instance;
};
