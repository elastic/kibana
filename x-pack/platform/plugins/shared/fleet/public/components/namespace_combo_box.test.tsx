/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { NamespaceComboBox } from './namespace_combo_box';

const renderField = (props: Partial<React.ComponentProps<typeof NamespaceComboBox>> = {}) =>
  render(
    <I18nProvider>
      <NamespaceComboBox
        namespace="prod"
        isEditPage={false}
        onNamespaceChange={jest.fn()}
        data-test-subj="namespace"
        {...props}
      />
    </I18nProvider>
  );

describe('NamespaceComboBox', () => {
  it('shows the help text under the field by default', () => {
    renderField();

    expect(screen.getByText(/Change the default namespace inherited/)).toBeInTheDocument();
    expect(screen.queryByTestId('namespace-helpTooltip')).not.toBeInTheDocument();
  });

  it('moves the help text to a tooltip next to the label on request', () => {
    renderField({ helpTextAsTooltip: true });

    expect(screen.queryByText(/Change the default namespace inherited/)).not.toBeInTheDocument();
    expect(screen.getByTestId('namespace-helpTooltip')).toBeInTheDocument();
    expect(screen.getByText('Namespace')).toBeInTheDocument();
  });

  it('accepts replacement tooltip text', () => {
    renderField({ helpTextAsTooltip: true, tooltipContent: 'Leave empty to use the global one.' });

    expect(screen.getByTestId('namespace-helpTooltip')).toBeInTheDocument();
  });
});
