/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
// eslint-disable-next-line import/no-extraneous-dependencies
import { render } from '@testing-library/react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { mount, MountRendererProps } from 'enzyme';

export function renderWithTheme(component: React.ReactNode, params?: any) {
  return render(<EuiThemeProvider>{component}</EuiThemeProvider>, params);
}

export function mountWithTheme(tree: React.ReactElement<any>) {
  function WrappingThemeProvider(props: any) {
    return <EuiThemeProvider>{props.children}</EuiThemeProvider>;
  }

  return mount(tree, {
    wrappingComponent: WrappingThemeProvider,
  } as MountRendererProps);
}
