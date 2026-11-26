/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AutomationsLockedDescription } from './automations_locked_description';

const navigateToContextEngine = jest.fn();

jest.mock('../../hooks/use_navigation', () => ({
  useNavigation: () => ({
    navigateToContextEngine,
    createContextEngineUrl: (path: string) => `/app/context_engine${path}`,
  }),
}));

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

describe('AutomationsLockedDescription', () => {
  beforeEach(() => {
    navigateToContextEngine.mockClear();
  });

  it('links to the Sources tab so it can open in a new tab', () => {
    renderWithProviders(<AutomationsLockedDescription aiIndexId="my-index" />);

    expect(screen.getByTestId('contextAutomationsLockedAddSourceLink')).toHaveAttribute(
      'href',
      '/app/context_engine/ai_index/my-index/sources'
    );
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }])(
    'lets the browser handle the click with %o',
    (eventInit) => {
      renderWithProviders(<AutomationsLockedDescription aiIndexId="my-index" />);

      fireEvent.click(screen.getByTestId('contextAutomationsLockedAddSourceLink'), eventInit);

      expect(navigateToContextEngine).not.toHaveBeenCalled();
    }
  );

  it('navigates to the Sources tab when the link is clicked', () => {
    renderWithProviders(<AutomationsLockedDescription aiIndexId="my-index" />);

    fireEvent.click(screen.getByTestId('contextAutomationsLockedAddSourceLink'));

    expect(navigateToContextEngine).toHaveBeenCalledWith('/ai_index/my-index/sources');
  });
});
