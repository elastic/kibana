/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* global jest */

// eslint-disable-next-line import/no-extraneous-dependencies
import { render } from '@testing-library/react';
import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';

export function renderWithTheme(component: React.ReactNode, params?: any) {
  return render(<EuiThemeProvider>{component}</EuiThemeProvider>, params);
}
