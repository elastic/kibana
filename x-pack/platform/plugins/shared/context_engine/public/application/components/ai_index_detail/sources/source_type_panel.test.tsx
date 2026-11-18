/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SourceTypePanel } from './source_type_panel';

const renderPanel = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

describe('SourceTypePanel', () => {
  it('renders the title, badge count, children, and data-test-subj', () => {
    renderPanel(
      <SourceTypePanel
        title="Elasticsearch data"
        badgeCount={3}
        data-test-subj="contextTestSourcePanel"
      >
        <div data-test-subj="panelChild">child content</div>
      </SourceTypePanel>
    );

    expect(screen.getByTestId('contextTestSourcePanel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Elasticsearch data' })).toBeInTheDocument();
    expect(screen.getByTestId('contextSourceTypePanelBadge')).toHaveTextContent('3');
    expect(screen.getByTestId('panelChild')).toHaveTextContent('child content');
  });
});
