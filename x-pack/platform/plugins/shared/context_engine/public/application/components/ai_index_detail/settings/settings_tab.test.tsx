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
import { useMemoryEnabled } from '../../../hooks/use_memory_enabled';
import { SettingsTab } from './settings_tab';

jest.mock('../../../hooks/use_memory_enabled', () => ({
  useMemoryEnabled: jest.fn(),
}));

jest.mock('./general_section', () => ({
  GeneralSection: () => <div data-test-subj="contextAiIndexSettingsGeneral" />,
}));

jest.mock('../automations_panel', () => ({
  AutomationsPanel: () => <div data-test-subj="contextAutomationsPanelStub" />,
}));

jest.mock('./dreaming_panel', () => ({
  DreamingPanel: () => <div data-test-subj="contextAiIndexDreamingPanel" />,
}));

jest.mock('./advanced_section', () => ({
  AdvancedSection: () => <div data-test-subj="contextAiIndexSettingsAdvanced" />,
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

const renderTab = (
  props: Partial<React.ComponentProps<typeof SettingsTab>> = {},
  memoryEnabled: boolean = false
) => {
  jest.mocked(useMemoryEnabled).mockReturnValue(memoryEnabled);
  return render(
    <I18nProvider>
      <EuiProvider>
        <SettingsTab
          isLoading={false}
          aiIndex={undefined}
          onSaved={jest.fn()}
          isAutomationsUnlocked={false}
          indexManagementHref={undefined}
          {...props}
        />
      </EuiProvider>
    </I18nProvider>
  );
};

describe('SettingsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('always renders the General section', () => {
    renderTab();

    expect(screen.getByTestId('contextAiIndexSettingsTab')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexSettingsGeneral')).toBeInTheDocument();
  });

  it('does not render Advanced when aiIndex is undefined', () => {
    renderTab();

    expect(screen.queryByTestId('contextAiIndexSettingsAdvanced')).not.toBeInTheDocument();
  });

  it('renders Advanced when aiIndex is defined', () => {
    renderTab({ aiIndex });

    expect(screen.getByTestId('contextAiIndexSettingsAdvanced')).toBeInTheDocument();
  });

  it('renders Memory and dreaming only when memory is enabled and aiIndex is defined', () => {
    renderTab({ aiIndex }, true);

    expect(screen.getByTestId('contextAiIndexDreamingPanel')).toBeInTheDocument();
  });

  it('does not render Memory and dreaming when memory is disabled', () => {
    renderTab({ aiIndex }, false);

    expect(screen.queryByTestId('contextAiIndexDreamingPanel')).not.toBeInTheDocument();
  });

  it('does not render Memory and dreaming without aiIndex even when memory is enabled', () => {
    renderTab({}, true);

    expect(screen.queryByTestId('contextAiIndexDreamingPanel')).not.toBeInTheDocument();
  });

  it('shows the locked Automations panel when automations are not unlocked', () => {
    renderTab({ isAutomationsUnlocked: false });

    expect(screen.getByTestId('contextAiIndexSettingsAutomationsLocked')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAutomationsPanelStub')).not.toBeInTheDocument();
  });

  it('shows the Automations panel when automations are unlocked', () => {
    renderTab({ aiIndex, isAutomationsUnlocked: true });

    expect(screen.queryByTestId('contextAiIndexSettingsAutomationsLocked')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextAutomationsPanelStub')).toBeInTheDocument();
  });
});
