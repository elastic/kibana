/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';

import { InstallKnowledgeBase, InstallKnowledgeBaseProps } from './install_knowledge_base';
import { translations } from './install_knowledge_base.translations';

describe('InstallKnowledgeBase', () => {
  const onInstallKnowledgeBase = jest.fn();

  const renderComponent = (props: InstallKnowledgeBaseProps) =>
    render(<InstallKnowledgeBase {...props} />, { wrapper: EuiThemeProvider });

  it('renders the component with the correct title and description', () => {
    renderComponent({ onInstallKnowledgeBase });

    expect(screen.queryByText(translations.cardTitle)).toBeInTheDocument();
    expect(screen.queryByText(translations.cardDescription)).toBeInTheDocument();
  });

  it('calls onInstallKnowledgeBase when the button is clicked', () => {
    const { getByText } = renderComponent({ onInstallKnowledgeBase });

    fireEvent.click(getByText(translations.installButton));
    expect(onInstallKnowledgeBase).toHaveBeenCalled();
  });

  it('renders the button with the correct text', () => {
    renderComponent({ onInstallKnowledgeBase });

    expect(screen.queryByText(translations.installButton)).toBeInTheDocument();
  });
});
