/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';

import {
  DATA_TEST_SUBJ_INSTALL_KNOWLEDGE_BASE_BUTTON,
  InstallKnowledgeBase,
  InstallKnowledgeBaseProps,
} from './install_knowledge_base';
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
    const { getByTestId } = renderComponent({ onInstallKnowledgeBase });

    fireEvent.click(getByTestId(DATA_TEST_SUBJ_INSTALL_KNOWLEDGE_BASE_BUTTON));
    expect(onInstallKnowledgeBase).toHaveBeenCalled();
  });

  it('renders the button with the correct text', () => {
    renderComponent({ onInstallKnowledgeBase });

    expect(screen.queryByText(translations.installButton)).toBeInTheDocument();
  });

  it('disables the button when isInstallAvailable is false', () => {
    renderComponent({ onInstallKnowledgeBase, isInstallAvailable: false });

    const button = screen.getByTestId(DATA_TEST_SUBJ_INSTALL_KNOWLEDGE_BASE_BUTTON);
    expect(button).toBeDisabled();
  });

  it('shows the unavailable tooltip when isInstallAvailable is false', () => {
    renderComponent({ onInstallKnowledgeBase, isInstallAvailable: false });

    expect(screen.getByTestId(DATA_TEST_SUBJ_INSTALL_KNOWLEDGE_BASE_BUTTON)).toBeInTheDocument();
  });

  it('disables the button and shows loading state when isInstalling is true', () => {
    renderComponent({ onInstallKnowledgeBase, isInstalling: true });

    const button = screen.getByTestId(DATA_TEST_SUBJ_INSTALL_KNOWLEDGE_BASE_BUTTON);
    expect(button).toBeDisabled();
  });

  it('renders the button with the correct text when isInstalling is true', () => {
    renderComponent({ onInstallKnowledgeBase, isInstalling: true });

    expect(screen.getByTestId(DATA_TEST_SUBJ_INSTALL_KNOWLEDGE_BASE_BUTTON)).toBeInTheDocument();
  });

  it('renders the button as enabled when isInstallAvailable is true and isInstalling is false', () => {
    renderComponent({ onInstallKnowledgeBase, isInstallAvailable: true, isInstalling: false });

    const button = screen.getByTestId(DATA_TEST_SUBJ_INSTALL_KNOWLEDGE_BASE_BUTTON);
    expect(button).not.toBeDisabled();
  });
});
