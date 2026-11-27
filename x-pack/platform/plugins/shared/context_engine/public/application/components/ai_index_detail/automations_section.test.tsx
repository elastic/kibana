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
import { MemoryRouter } from 'react-router-dom';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { AutomationsSection } from './automations_section';

jest.mock('./automations_panel', () => ({
  AutomationsPanel: () => <div data-test-subj="contextAutomationsPanelStub" />,
}));

jest.mock('./automations_locked_description', () => ({
  AutomationsLockedDescription: () => (
    <div data-test-subj="contextAutomationsLockedDescriptionStub" />
  ),
}));

const aiIndex: GetAiIndexResponse = {
  id: 'tickets',
  managed: false,
  dest: { type: 'index', value: 'ai-index-idx-tickets' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-11-01T00:00:00.000Z',
  date_modified: '2026-11-01T00:00:00.000Z',
};

const renderSection = (
  isUnlocked: boolean,
  { pathname = '/ai_index/tickets/settings', isLoading = false } = {}
) => {
  const wrap = (loading: boolean) => (
    <I18nProvider>
      <EuiProvider>
        <MemoryRouter initialEntries={[pathname]}>
          <AutomationsSection
            isLoading={loading}
            aiIndex={aiIndex}
            aiIndexId="tickets"
            onSaved={jest.fn()}
            isUnlocked={isUnlocked}
          />
        </MemoryRouter>
      </EuiProvider>
    </I18nProvider>
  );
  const view = render(wrap(isLoading));
  return { rerender: (loading: boolean) => view.rerender(wrap(loading)) };
};

describe('AutomationsSection', () => {
  it('renders the locked panel when automations are locked', () => {
    renderSection(false);

    expect(screen.getByTestId('contextAutomationsLocked')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAutomationsPanelStub')).not.toBeInTheDocument();
  });

  it('renders AutomationsPanel when unlocked', () => {
    renderSection(true);

    expect(screen.getByTestId('contextAutomationsPanelStub')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAutomationsLocked')).not.toBeInTheDocument();
  });
  describe('when a link targets #automations', () => {
    const scrollIntoView = jest.fn();
    const automationsPath = '/ai_index/tickets/settings#automations';

    beforeEach(() => {
      scrollIntoView.mockClear();
      Element.prototype.scrollIntoView = scrollIntoView;
    });

    it('scrolls to the locked panel and focuses its heading', () => {
      renderSection(false, { pathname: automationsPath });

      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      expect(screen.getByRole('heading', { name: 'Automations' })).toHaveFocus();
    });

    it('waits for the AI index before it scrolls', () => {
      const { rerender } = renderSection(false, { pathname: automationsPath, isLoading: true });
      expect(scrollIntoView).not.toHaveBeenCalled();

      rerender(false);

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });

    it('does not scroll without the hash', () => {
      renderSection(false);

      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('waits while a section above is still loading', () => {
      render(
        <I18nProvider>
          <EuiProvider>
            <MemoryRouter initialEntries={[automationsPath]}>
              <AutomationsSection
                isLoading={false}
                aiIndex={aiIndex}
                aiIndexId="tickets"
                onSaved={jest.fn()}
                isUnlocked={false}
                isContentAboveLoading={true}
              />
            </MemoryRouter>
          </EuiProvider>
        </I18nProvider>
      );

      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });
});
