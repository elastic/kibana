/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { AssistantCallToAction, AssistantCallToActionProps } from './call_to_action';
import { translations } from './call_to_action.translations';

describe('AssistantCallToAction', () => {
  const renderComponent = (props: Partial<AssistantCallToActionProps> = {}) =>
    render(<AssistantCallToAction {...props} />, { wrapper: EuiThemeProvider });

  it('renders with default title and no description or children', async () => {
    renderComponent();

    expect(screen.queryByText(translations.title)).toBeInTheDocument();
    expect(screen.queryByText(translations.description)).not.toBeInTheDocument();
  });

  it('renders with a custom title and description', async () => {
    const title = 'Custom Title';
    const description = 'Custom Description';
    renderComponent({ title, description });

    expect(screen.queryByText(title)).toBeInTheDocument();
    expect(screen.queryByText(description)).toBeInTheDocument();
  });

  it('renders with children', async () => {
    const childText = 'Child Element';
    renderComponent({ children: <div>{childText}</div> });

    expect(screen.queryByText(childText)).toBeInTheDocument();
  });
});
