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
import { useKibana } from '../hooks/use_kibana';
import { useMemoryEnabled } from '../hooks/use_memory_enabled';
import { MemoryPage } from './memory_page';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../hooks/use_memory_enabled', () => ({ useMemoryEnabled: jest.fn() }));
jest.mock('../hooks/use_landing_tabs', () => ({ useLandingTabs: () => undefined }));
jest.mock('../hooks/use_context_engine_breadcrumbs', () => ({
  useContextEngineBreadcrumbs: jest.fn(),
}));
jest.mock('../layout/context_engine_page_header', () => ({
  ContextEngineLandingHeader: () => null,
}));
jest.mock('../layout/context_engine_page_template', () => ({
  ContextEnginePageTemplate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ContextEnginePageSection: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../components/memory/dreaming_panel', () => ({
  DreamingPanel: () => <div data-test-subj="contextMemoryDreamingPanel" />,
}));
jest.mock('../components/memory/memory_stores_panel', () => ({
  MemoryStoresPanel: () => <div data-test-subj="contextMemoryStoresPanel" />,
}));

const mockUseMemoryEnabled = jest.mocked(useMemoryEnabled);

describe('MemoryPage', () => {
  const renderPage = () =>
    render(
      <I18nProvider>
        <EuiProvider>
          <MemoryPage />
        </EuiProvider>
      </I18nProvider>
    );

  beforeEach(() => {
    jest.mocked(useKibana).mockReturnValue({
      services: { docLinks: { links: { contextEngine: { overview: 'https://docs' } } } },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('shows dreaming and the memory stores while memory is on', () => {
    mockUseMemoryEnabled.mockReturnValue(true);

    renderPage();

    expect(screen.getByTestId('contextMemoryDreamingPanel')).toBeInTheDocument();
    expect(screen.getByTestId('contextMemoryStoresPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('contextMemoryDisabled')).not.toBeInTheDocument();
  });

  it('explains how to turn memory on while it is off', () => {
    mockUseMemoryEnabled.mockReturnValue(false);

    renderPage();

    expect(screen.getByTestId('contextMemoryDisabled')).toHaveTextContent(
      'contextEngine:memoryEnabled'
    );
    expect(screen.queryByTestId('contextMemoryDreamingPanel')).not.toBeInTheDocument();
  });
});
