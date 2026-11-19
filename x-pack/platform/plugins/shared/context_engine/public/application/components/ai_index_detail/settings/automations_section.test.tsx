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
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { AutomationsSection } from './automations_section';

jest.mock('../automations_panel', () => ({
  AutomationsPanel: () => <div data-test-subj="contextAutomationsPanelStub" />,
}));

jest.mock('../automations_locked_description', () => ({
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

const renderSection = (isUnlocked: boolean) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <AutomationsSection
          isLoading={false}
          aiIndex={aiIndex}
          aiIndexId="tickets"
          onSaved={jest.fn()}
          isUnlocked={isUnlocked}
        />
      </EuiProvider>
    </I18nProvider>
  );

describe('AutomationsSection', () => {
  it('renders the locked panel when automations are locked', () => {
    renderSection(false);

    expect(screen.getByTestId('contextAiIndexSettingsAutomationsLocked')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAutomationsPanelStub')).not.toBeInTheDocument();
  });

  it('uses lockedTestSubj on the locked panel', () => {
    renderSection(false);

    expect(screen.getByTestId('contextAutomationsLocked')).toBeInTheDocument();
  });

  it('renders AutomationsPanel when unlocked', () => {
    renderSection(true);

    expect(screen.getByTestId('contextAutomationsPanelStub')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexSettingsAutomationsLocked')).not.toBeInTheDocument();
  });
});
