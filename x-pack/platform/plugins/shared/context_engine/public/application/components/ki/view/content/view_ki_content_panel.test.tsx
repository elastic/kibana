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
import type { KiDocument } from '../../../../../../common/http_api/knowledge_indicators';
import { ViewKiContentPanel } from './view_ki_content_panel';

const renderPanel = (document: KiDocument) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <ViewKiContentPanel document={document} />
      </EuiProvider>
    </I18nProvider>
  );

describe('ViewKiContentPanel', () => {
  it('renders content when document.content is a non-empty string', () => {
    renderPanel({ content: 'Hello world' });

    expect(screen.getByTestId('contextViewKiContent')).toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiContentEmpty')).not.toBeInTheDocument();
  });

  it('renders empty state when content is missing', () => {
    renderPanel({});

    expect(screen.getByTestId('contextViewKiContentEmpty')).toHaveTextContent('No content');
    expect(screen.queryByTestId('contextViewKiContent')).not.toBeInTheDocument();
  });

  it('renders empty state when content is an empty string', () => {
    renderPanel({ content: '' });

    expect(screen.getByTestId('contextViewKiContentEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiContent')).not.toBeInTheDocument();
  });
});
